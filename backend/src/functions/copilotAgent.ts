import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent } from '../utils/auth'
import * as https from 'https'
import * as http from 'http'

const bedrockClient = new BedrockRuntimeClient({
  region: 'us-east-2',
})

/**
 * Simple HTTP GET request using Node.js built-in modules
 */
function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers, timeout: 8000 }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, headers).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')) })
  })
}

/**
 * Strip HTML tags and decode common entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Search company info using DuckDuckGo HTML page
 */
async function searchCompanyInfo(companyName: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${companyName} 公司介绍 主营业务 产品服务`)
    const url = `https://html.duckduckgo.com/html/?q=${query}`
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    const html = await httpGet(url, headers)

    // Extract search result snippets from DuckDuckGo HTML
    const snippets: string[] = []
    const resultRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
    let match
    while ((match = resultRegex.exec(html)) !== null && snippets.length < 8) {
      const text = stripHtml(match[1])
      if (text.length > 20) {
        snippets.push(text)
      }
    }

    // Also try extracting from result__body if snippet class doesn't match
    if (snippets.length < 3) {
      const bodyRegex = /<td class="result__snippet"[^>]*>([\s\S]*?)<\/td>/gi
      while ((match = bodyRegex.exec(html)) !== null && snippets.length < 8) {
        const text = stripHtml(match[1])
        if (text.length > 20) {
          snippets.push(text)
        }
      }
    }

    if (snippets.length === 0) {
      return '未找到该企业的网络搜索结果'
    }

    return snippets.join('\n')
  } catch (error: any) {
    console.error('Web search error:', error.message)
    return '网络搜索失败，将仅基于已有知识进行分析'
  }
}

/**
 * Load all industries and sub-industries from DynamoDB
 */
async function loadIndustryData(): Promise<string> {
  // Load visible industries only
  const industriesResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      FilterExpression: 'SK = :sk AND isVisible = :visible',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
        ':visible': true,
      },
    })
  )

  const industries = industriesResult.Items || []
  const lines: string[] = []

  for (const industry of industries) {
    lines.push(`行业: ${industry.name}`)
    if (industry.definition) lines.push(`  定义: ${industry.definition}`)
    if (industry.definitionCn) lines.push(`  中文定义: ${industry.definitionCn}`)

    // Load sub-industries
    const subResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `INDUSTRY#${industry.id}`,
        },
      })
    )

    for (const sub of subResult.Items || []) {
      lines.push(`  子行业: ${sub.name}`)
      if (sub.definition) lines.push(`    定义: ${sub.definition}`)
      if (sub.definitionCn) lines.push(`    中文定义: ${sub.definitionCn}`)
      if (sub.typicalGlobalCompanies?.length > 0) {
        lines.push(`    典型全球企业: ${sub.typicalGlobalCompanies.join(', ')}`)
      }
      if (sub.typicalChineseCompanies?.length > 0) {
        lines.push(`    典型中国企业: ${sub.typicalChineseCompanies.join(', ')}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Call Bedrock Nova Premier to classify a company
 */
async function classifyCompany(companyName: string, industryData: string, searchResults: string): Promise<string> {
  const systemPrompt = `你是一个专业的行业分类助手。你的任务是根据用户提供的企业名称，分析该企业的行业归属。

你将获得两部分参考信息：
1. 网络搜索结果：关于该企业的公开信息摘要
2. 行业信息数据库：系统中定义的所有行业和子行业

分析步骤：
1. 仔细阅读网络搜索结果，了解该企业的主营业务、产品/服务、解决方案
2. 结合行业信息数据库，判断该企业最可能属于哪个行业和子行业

重要规则：
- 你必须基于网络搜索结果中的实际信息来做判断
- 如果搜索结果中没有足够信息来确认该企业的主营业务，请直接回答"无法确认该企业的行业归属，建议提供更多企业信息（如官网、主营业务等）以便准确分类"
- 不要猜测，不要编造企业信息
- 只从下方数据库中的行业和子行业中选择匹配项
- 如果企业业务跨多个行业，列出主要的1-2个行业

请按以下格式回答：
1. 企业名称
2. 企业简介（基于搜索结果，简要描述该企业的主营业务、产品和服务）
3. 所属行业（从数据库中匹配）
4. 所属子行业（如果能匹配到）
5. 分类依据（基于企业实际业务说明为什么归入该行业）
6. 该行业/子行业中的其他典型企业（如果数据库中有）

请用中文回答。

===== 网络搜索结果 =====
${searchResults}

===== 行业信息数据库 =====
${industryData}`

  const payload = {
    messages: [
      {
        role: 'user',
        content: [{ text: `请帮我分析这个企业属于哪个行业：${companyName}` }],
      },
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.3,
    },
  }

  const command = new InvokeModelCommand({
    modelId: 'us.amazon.nova-premier-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })

  const response = await bedrockClient.send(command)
  const responseBody = JSON.parse(new TextDecoder().decode(response.body))

  return responseBody.output?.message?.content?.[0]?.text || '无法获取分析结果'
}

/**
 * Handle copilot chat request
 * POST /public/copilot/chat
 */
async function handleChat(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401)
    }

    const body = JSON.parse(event.body || '{}')
    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '请输入企业名称', 400)
    }

    const companyName = message.trim()

    // Run web search and DynamoDB load in parallel
    const [searchResults, industryData] = await Promise.all([
      searchCompanyInfo(companyName),
      loadIndustryData(),
    ])

    console.log(`Search results for "${companyName}": ${searchResults.substring(0, 200)}...`)

    // Call Bedrock Nova Premier with search results
    const result = await classifyCompany(companyName, industryData, searchResults)

    return successResponse({ reply: result })
  } catch (error: any) {
    console.error('Copilot chat error:', error)
    return errorResponse('INTERNAL_ERROR', '分析失败，请稍后重试', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.rawPath || event.path

  console.log('Copilot Event:', JSON.stringify({ method, path }))

  try {
    if (method === 'POST' && path?.match(/\/public\/copilot\/chat$/)) {
      return await handleChat(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
