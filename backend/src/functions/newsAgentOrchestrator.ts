/**
 * Bedrock Agent Orchestrator for News Search
 * Invokes Bedrock Agent which can call searchGoogleNews action
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  InvokeAgentCommandOutput,
} from '@aws-sdk/client-bedrock-agent-runtime'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent, hasIndustryAccess } from '../utils/auth'

const bedrockAgentClient = new BedrockAgentRuntimeClient({ region: 'us-east-2' })

// Bedrock Agent ID and Alias ID (will be set via environment variables after CDK deployment)
const AGENT_ID = process.env.NEWS_AGENT_ID || ''
const AGENT_ALIAS_ID = process.env.NEWS_AGENT_ALIAS_ID || 'TSTALIASID' // Test alias

interface AgentNewsItem {
  title: string
  summary: string
  externalUrl: string
  author: string
  publishedAt: string
}

/**
 * Parse agent response chunks and extract final response
 */
async function parseAgentResponse(output: InvokeAgentCommandOutput): Promise<string> {
  let fullResponse = ''

  if (output.completion) {
    for await (const event of output.completion) {
      if (event.chunk && event.chunk.bytes) {
        const chunkText = new TextDecoder().decode(event.chunk.bytes)
        fullResponse += chunkText
        console.log('[AGENT] Chunk:', chunkText.substring(0, 200))
      }
    }
  }

  return fullResponse
}

/**
 * Handle news search request via Bedrock Agent
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

    console.log(`[ORCHESTRATOR] Industry: ${industryName} (${industryId}), Query: ${query}`)

    if (!AGENT_ID) {
      console.error('[ORCHESTRATOR] NEWS_AGENT_ID not configured')
      return errorResponse('CONFIGURATION_ERROR', 'Bedrock Agent 未配置', 500)
    }

    // Build prompt for agent with clear instructions
    const prompt = `你是一个专业的新闻编辑助手。用户想要搜索关于"${query}"的最新新闻，行业背景是"${industryName}"。

你有以下工具可以使用：
1. searchGoogleNews(keyword) - 搜索单个关键词的 Google News（简单搜索）
2. searchGoogleNewsAdvanced(keywords[], daysBack?) - 搜索多个关键词并支持时间过滤（高级搜索）
   - keywords: 关键词数组，例如 ["油气 数字化", "油气 信息化", "OSDU"]
   - daysBack: 可选，搜索过去N天的新闻，例如 10 表示过去10天
3. fetchRssFeed(url) - 从特定 RSS feed URL 获取新闻
4. searchMultipleSources(keyword, rssFeedUrls[]) - 综合 Google News 和多个 RSS feeds

**工具选择指南**：
- 如果用户提到"过去X天"、"最近X天"、"X天内"，使用 searchGoogleNewsAdvanced 并设置 daysBack
- 如果用户提到多个关键词或主题（如"数字化、信息化、智能化"），使用 searchGoogleNewsAdvanced 并传入多个关键词
- 如果只是简单的单关键词搜索，使用 searchGoogleNews
- 如果用户指定了特定网站或 RSS 源，使用 fetchRssFeed

**重要**：分析用户请求"${query}"，识别：
- 是否有时间限制？（提取天数）
- 有几个关键词或主题？（拆分成数组）
- 是否需要特定来源？

搜索完成后，请：
1. 筛选出与"${query}"最相关的新闻（最多10条）
2. 对每条新闻写一个200字左右的中文概括摘要
3. 提取标题、链接、作者、发布时间

请严格按照以下JSON格式输出，不要有任何其他文字：
{
  "news": [
    {
      "title": "新闻标题",
      "summary": "200字左右的中文概括",
      "externalUrl": "原文链接",
      "author": "来源或作者",
      "publishedAt": "YYYY-MM-DDTHH:mm:ss.000Z格式的时间"
    }
  ]
}`

    console.log('[ORCHESTRATOR] Invoking Bedrock Agent...')

    // Invoke Bedrock Agent
    const command = new InvokeAgentCommand({
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: `news-${Date.now()}`, // Unique session per request
      inputText: prompt,
    })

    const response = await bedrockAgentClient.send(command)
    const agentResponse = await parseAgentResponse(response)

    console.log(`[ORCHESTRATOR] Agent response length: ${agentResponse.length}`)
    console.log(`[ORCHESTRATOR] Agent response preview: ${agentResponse.substring(0, 500)}`)

    // Parse JSON from agent response
    try {
      let jsonStr = agentResponse.trim()

      // Try to extract from markdown code block
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }

      // Try to find JSON object with news array
      const newsObjMatch = jsonStr.match(/\{\s*"news"\s*:\s*\[[\s\S]*?\]\s*\}/)
      if (newsObjMatch) {
        jsonStr = newsObjMatch[0]
      }

      const parsed = JSON.parse(jsonStr)

      if (!parsed.news || !Array.isArray(parsed.news)) {
        console.log('[ORCHESTRATOR] No news array in response')
        return successResponse({ news: [], message: '未找到相关新闻' })
      }

      console.log(`[ORCHESTRATOR] Found ${parsed.news.length} news items`)

      if (parsed.news.length === 0) {
        return successResponse({ news: [], message: 'Google News 中未找到与关键词相关的新闻' })
      }

      return successResponse(parsed)
    } catch (parseError: any) {
      console.error('[ORCHESTRATOR] Failed to parse agent response:', agentResponse.substring(0, 1000))
      return successResponse({ news: [], message: 'AI返回格式异常，请重试' })
    }
  } catch (error: any) {
    console.error('[ORCHESTRATOR] Error:', error)
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
    console.error('[ORCHESTRATOR] Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
