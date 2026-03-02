import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent, hasIndustryAccess } from '../utils/auth'
import * as https from 'https'
import * as http from 'http'

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-2' })

function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers, timeout: 15000 }, (res) => {
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

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch news feeds for an industry from DynamoDB
 */
async function getNewsFeeds(industryId: string): Promise<Array<{ name: string; url: string }>> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.NEWS_FEEDS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `INDUSTRY#${industryId}`,
      },
    })
  )
  return (result.Items || []).map((item) => ({ name: item.name, url: item.url }))
}

/**
 * Fetch content from a news feed URL and extract text
 */
async function fetchFeedContent(url: string): Promise<string> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    const html = await httpGet(url, headers)
    const text = stripHtml(html)
    // Limit to 8000 chars to avoid token limits
    return text.substring(0, 8000)
  } catch (error: any) {
    console.error(`Failed to fetch ${url}:`, error.message)
    return ''
  }
}

/**
 * Use Bedrock Nova Premier to extract and summarize news from feed content
 */
async function extractNewsFromContent(
  feedContents: Array<{ name: string; url: string; content: string }>,
  userQuery: string,
  industryName: string
): Promise<string> {
  const feedTexts = feedContents
    .filter((f) => f.content.length > 100)
    .map((f) => `===== 来源: ${f.name} (${f.url}) =====\n${f.content}`)
    .join('\n\n')

  if (!feedTexts) {
    return JSON.stringify({ news: [], message: '无法从订阅源获取内容' })
  }

  const systemPrompt = `你是一个专业的新闻编辑助手。你的任务是从多个新闻订阅源的网页内容中，根据用户的检索需求，提取相关的新闻文章。

行业: ${industryName}
用户检索需求: ${userQuery}

请从以下网页内容中提取与用户需求相关的新闻文章。对每篇新闻：
1. 提取标题
2. 写一个200字左右的中文概括摘要
3. 提取原文链接（如果有）
4. 提取作者（如果有，没有则写"编辑部"）
5. 提取发布时间（如果有，没有则用今天的日期）

重要规则：
- 只提取与用户检索需求相关的新闻
- 每篇摘要控制在200字左右
- 用中文输出
- 最多提取10篇新闻
- 如果没有找到相关新闻，返回空列表

你必须严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "news": [
    {
      "title": "新闻标题",
      "summary": "200字左右的中文概括",
      "externalUrl": "原文链接或空字符串",
      "author": "作者名",
      "publishedAt": "YYYY-MM-DDTHH:mm:ss.000Z格式的时间"
    }
  ]
}`

  const payload = {
    messages: [
      {
        role: 'user',
        content: [{ text: `以下是从新闻订阅源获取的网页内容：\n\n${feedTexts}` }],
      },
    ],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      maxTokens: 4096,
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
  return responseBody.output?.message?.content?.[0]?.text || JSON.stringify({ news: [] })
}

/**
 * Handle news search request
 * POST /admin/news-agent/search
 */
async function handleSearch(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { industryId, query } = body

    if (!industryId || !query) {
      return errorResponse('VALIDATION_ERROR', '缺少必填参数', 400)
    }

    if (!hasIndustryAccess(user, industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限访问该行业', 403)
    }

    // Get industry name
    const industryResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        FilterExpression: 'id = :id AND SK = :sk',
        ExpressionAttributeValues: { ':id': industryId, ':sk': 'METADATA' },
        Limit: 1,
      })
    )
    const industryName = industryResult.Items?.[0]?.name || '未知行业'

    // Get news feeds for this industry
    const feeds = await getNewsFeeds(industryId)
    if (feeds.length === 0) {
      return successResponse({ news: [], message: '该行业暂无配置订阅源，请先在设置中添加订阅源' })
    }

    // Fetch content from each feed (parallel, max 5)
    const feedsToFetch = feeds.slice(0, 5)
    const feedContents = await Promise.all(
      feedsToFetch.map(async (feed) => {
        const content = await fetchFeedContent(feed.url)
        return { name: feed.name, url: feed.url, content }
      })
    )

    // Use Bedrock to extract and summarize news
    const resultText = await extractNewsFromContent(feedContents, query, industryName)

    // Parse the JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = resultText
      const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }
      const parsed = JSON.parse(jsonStr)
      return successResponse(parsed)
    } catch {
      console.error('Failed to parse Bedrock response:', resultText.substring(0, 500))
      return successResponse({ news: [], message: 'AI返回格式异常，请重试' })
    }
  } catch (error: any) {
    console.error('News agent search error:', error)
    return errorResponse('INTERNAL_ERROR', '检索失败，请稍后重试', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.rawPath || event.path

  try {
    const user = getUserFromEvent(event)
    if (!user || !['admin', 'specialist'].includes(user.role)) {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }

    if (method === 'POST' && path?.match(/\/admin\/news-agent\/search$/)) {
      return await handleSearch(event, user)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
