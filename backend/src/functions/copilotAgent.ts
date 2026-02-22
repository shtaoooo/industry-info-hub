import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent } from '../utils/auth'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

/**
 * Load all industries and sub-industries from DynamoDB
 */
async function loadIndustryData(): Promise<string> {
  // Load industries
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
async function classifyCompany(companyName: string, industryData: string): Promise<string> {
  const systemPrompt = `你是一个行业分类助手。你的任务是根据用户提供的企业名称，结合以下行业信息数据库，判断该企业最可能属于哪个行业和子行业。

请按以下格式回答：
1. 企业名称
2. 所属行业（从数据库中匹配）
3. 所属子行业（如果能匹配到）
4. 分类依据（简要说明为什么归入该行业）
5. 该行业/子行业中的其他典型企业（如果数据库中有）

如果企业名称不明确或无法确定行业，请说明原因并给出最可能的几个选项。
请用中文回答。

以下是行业信息数据库：
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
      maxTokens: 1024,
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

    // Load industry data from DynamoDB
    const industryData = await loadIndustryData()

    // Call Bedrock Nova Premier
    const result = await classifyCompany(message.trim(), industryData)

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
