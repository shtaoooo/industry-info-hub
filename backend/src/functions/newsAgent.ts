import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
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
 * Detect if content is RSS/Atom XML feed
 */
function isRssFeed(content: string): boolean {
  const trimmed = content.trim().substring(0, 500)
  return (
    trimmed.includes('<rss') ||
    trimmed.includes('<feed') ||
    trimmed.includes('<channel>') ||
    (trimmed.includes('<?xml') && (trimmed.includes('<rss') || trimmed.includes('<feed') || content.includes('<channel>')))
  )
}

/**
 * Parse RSS 2.0 feed items
 */
function parseRssItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string; author: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string; author: string }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const itemXml = match[1]
    const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const content = itemXml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || ''
    const author = itemXml.match(/<(?:dc:creator|author)[^>]*>([\s\S]*?)<\/(?:dc:creator|author)>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    items.push({ title, link, description: stripHtml(content || description).substring(0, 2000), pubDate, author })
  }
  return items
}

/**
 * Parse Atom feed entries
 */
function parseAtomEntries(xml: string): Array<{ title: string; link: string; description: string; pubDate: string; author: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string; author: string }> = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
  let match
  while ((match = entryRegex.exec(xml)) !== null && items.length < 20) {
    const entryXml = match[1]
    const title = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']*)["'][^>]*\/?>/i)
    const link = linkMatch?.[1] || ''
    const summary = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const content = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || ''
    const pubDate = entryXml.match(/<(?:published|updated)[^>]*>([\s\S]*?)<\/(?:published|updated)>/i)?.[1]?.trim() || ''
    const author = entryXml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i)?.[1]?.trim() || ''
    items.push({ title, link, description: stripHtml(content || summary).substring(0, 2000), pubDate, author })
  }
  return items
}

/**
 * Format parsed feed items into structured text for Bedrock
 */
function formatFeedItems(items: Array<{ title: string; link: string; description: string; pubDate: string; author: string }>): string {
  return items.map((item, i) => 
    `[${i + 1}] 标题: ${item.title}\n链接: ${item.link}\n时间: ${item.pubDate}\n作者: ${item.author}\n内容: ${item.description}`
  ).join('\n\n')
}

/**
 * Fetch content from a news feed URL and extract text
 * Automatically detects RSS/Atom feeds and parses them structurally
 */
async function fetchFeedContent(url: string): Promise<{ content: string; isRss: boolean }> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.9,application/atom+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    const rawContent = await httpGet(url, headers)
    
    // Check if it's an RSS/Atom feed
    if (isRssFeed(rawContent)) {
      console.log(`[FEED] Detected RSS/Atom feed: ${url} (${rawContent.length} bytes)`)
      
      // Try RSS 2.0 first, then Atom
      let items = parseRssItems(rawContent)
      if (items.length === 0) {
        items = parseAtomEntries(rawContent)
      }
      
      console.log(`[FEED] Parsed ${items.length} items from RSS/Atom feed: ${url}`)
      if (items.length > 0) {
        console.log(`[FEED] First item: ${items[0].title}`)
      }
      
      const formatted = formatFeedItems(items)
      return { content: formatted.substring(0, 12000), isRss: true }
    }
    
    // Regular HTML page - strip and extract text
    const text = stripHtml(rawContent)
    console.log(`[FEED] Fetched HTML page: ${url} - HTML: ${rawContent.length} bytes, Text: ${text.length} chars, Preview: ${text.substring(0, 200)}`)
    return { content: text.substring(0, 8000), isRss: false }
  } catch (error: any) {
    console.error(`[FEED] Failed to fetch ${url}:`, error.message)
    return { content: '', isRss: false }
  }
}

/**
 * Use Bedrock Nova Premier to extract and summarize news from feed content
 */
async function extractNewsFromContent(
  feedContents: Array<{ name: string; url: string; content: string; isRss: boolean }>,
  userQuery: string,
  industryName: string
): Promise<string> {
  const hasRssFeeds = feedContents.some((f) => f.isRss && f.content.length > 50)
  
  const feedTexts = feedContents
    .filter((f) => f.content.length > 50)
    .map((f) => `===== 来源: ${f.name} (${f.url}) [${f.isRss ? 'RSS/Atom Feed' : 'HTML页面'}] =====\n${f.content}`)
    .join('\n\n')

  if (!feedTexts) {
    return JSON.stringify({ news: [], message: '无法从订阅源获取内容' })
  }

  const rssHint = hasRssFeeds 
    ? '部分内容来自RSS/Atom订阅源，已经结构化解析，每条新闻有标题、链接、时间、作者和内容摘要。请直接使用这些结构化信息。'
    : ''

  const systemPrompt = `你是一个专业的新闻编辑助手。你的任务是从多个新闻订阅源的内容中，根据用户的检索需求，提取相关的新闻文章。

行业: ${industryName}
用户检索需求: ${userQuery}
${rssHint}

请从以下内容中提取与用户需求相关的新闻文章。对每篇新闻：
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

你必须严格按照以下JSON格式输出，不要输出任何其他内容，不要使用markdown代码块，直接输出纯JSON：
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
}

再次强调：只输出JSON，不要有任何前缀、后缀或解释文字。`

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
 * Handle news search request using Google News RSS
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

    console.log(`[AGENT] Industry: ${industryName} (${industryId}), Query: ${query}`)

    // Build Google News RSS URL with query
    // Format: https://news.google.com/rss/search?q={query}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans
    const encodedQuery = encodeURIComponent(query)
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
    
    console.log(`[AGENT] Fetching Google News RSS: ${googleNewsUrl}`)

    // Fetch Google News RSS feed
    const { content, isRss } = await fetchFeedContent(googleNewsUrl)
    
    if (!content || content.length < 100) {
      console.log(`[AGENT] Failed to fetch Google News RSS or content too short: ${content.length} chars`)
      return successResponse({ 
        news: [], 
        message: '无法从 Google News 获取新闻，请稍后重试或更换关键词' 
      })
    }

    console.log(`[AGENT] Fetched Google News RSS - type: ${isRss ? 'RSS' : 'HTML'}, length: ${content.length}`)

    // Use Bedrock to extract and summarize news
    const feedContents = [{ name: 'Google News', url: googleNewsUrl, content, isRss }]
    const resultText = await extractNewsFromContent(feedContents, query, industryName)
    console.log(`[AGENT] Bedrock response length: ${resultText.length}, Preview: ${resultText.substring(0, 500)}`)

    // Parse the JSON response
    try {
      // Extract JSON from response (handle markdown code blocks and extra text)
      let jsonStr = resultText.trim()
      
      // Try to extract from markdown code block
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim()
      }
      
      // Try to find JSON object with news array
      const newsObjMatch = jsonStr.match(/\{\s*"news"\s*:\s*\[[\s\S]*?\]\s*\}/)
      if (newsObjMatch) {
        jsonStr = newsObjMatch[0]
      } else if (!jsonStr.startsWith('{')) {
        const objMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (objMatch) {
          jsonStr = objMatch[0]
        }
      }
      
      const parsed = JSON.parse(jsonStr)
      
      // Ensure the response has the expected structure
      if (!parsed.news || !Array.isArray(parsed.news)) {
        console.log('[AGENT] Parsed response has no news array:', JSON.stringify(parsed).substring(0, 200))
        return successResponse({ news: [], message: '未找到相关新闻' })
      }

      console.log(`[AGENT] Found ${parsed.news.length} news items`)
      
      if (parsed.news.length === 0) {
        return successResponse({ news: [], message: 'Google News 中未找到与关键词相关的新闻，请尝试其他关键词' })
      }
      
      return successResponse(parsed)
    } catch (parseError: any) {
      console.error('[AGENT] Failed to parse Bedrock response:', resultText.substring(0, 1000))
      // Try one more time with a more aggressive extraction
      try {
        const lastResort = resultText.match(/\{\s*"news"\s*:\s*\[[\s\S]*?\]\s*\}/)
        if (lastResort) {
          const parsed = JSON.parse(lastResort[0])
          console.log(`[AGENT] Last resort parse found ${parsed.news?.length || 0} news items`)
          return successResponse(parsed)
        }
      } catch {
        // Give up
      }
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
