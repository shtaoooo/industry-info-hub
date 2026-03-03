/**
 * Bedrock Agent Action Group for News Search
 * Provides searchGoogleNews tool that fetches and parses Google News RSS
 */

import * as https from 'https'
import * as http from 'http'

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
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
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
 * Parse RSS 2.0 feed items
 */
function parseRssItems(
  xml: string
): Array<{ title: string; link: string; description: string; pubDate: string; source: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string; source: string }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < 30) {
    const itemXml = match[1]
    const title =
      itemXml
        .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .trim() || ''
    const link =
      itemXml
        .match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
        ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .trim() || ''
    const description =
      itemXml
        .match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
        ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .trim() || ''
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || ''
    const source =
      itemXml
        .match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]
        ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .trim() || ''

    items.push({
      title,
      link,
      description: stripHtml(description).substring(0, 500),
      pubDate,
      source,
    })
  }
  return items
}

/**
 * Search Google News RSS by keyword
 */
async function searchGoogleNews(keyword: string): Promise<string> {
  try {
    console.log(`[ACTION] searchGoogleNews called with keyword: ${keyword}`)

    // Build Google News RSS URL
    const encodedQuery = encodeURIComponent(keyword)
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`

    console.log(`[ACTION] Fetching: ${googleNewsUrl}`)

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    const rawContent = await httpGet(googleNewsUrl, headers)

    if (!rawContent || rawContent.length < 100) {
      console.log(`[ACTION] Content too short: ${rawContent.length} bytes`)
      return JSON.stringify({ success: false, message: '无法获取 Google News 内容', items: [] })
    }

    console.log(`[ACTION] Fetched ${rawContent.length} bytes`)

    // Parse RSS
    const items = parseRssItems(rawContent)
    console.log(`[ACTION] Parsed ${items.length} news items`)

    if (items.length === 0) {
      return JSON.stringify({ success: false, message: '未找到相关新闻', items: [] })
    }

    // Return structured data for agent to process
    return JSON.stringify({
      success: true,
      message: `找到 ${items.length} 条新闻`,
      items: items.slice(0, 20), // Limit to 20 items
    })
  } catch (error: any) {
    console.error('[ACTION] searchGoogleNews error:', error)
    return JSON.stringify({
      success: false,
      message: `搜索失败: ${error.message}`,
      items: [],
    })
  }
}

/**
 * Lambda handler for Bedrock Agent Action Group
 * Handles the action group invocation format
 */
export async function handler(event: any): Promise<any> {
  console.log('[ACTION GROUP] Event:', JSON.stringify(event, null, 2))

  const actionGroup = event.actionGroup
  const apiPath = event.apiPath
  const parameters = event.parameters || []

  console.log(`[ACTION GROUP] Action: ${actionGroup}, Path: ${apiPath}`)

  try {
    // Handle searchGoogleNews action
    if (apiPath === '/searchGoogleNews') {
      const keywordParam = parameters.find((p: any) => p.name === 'keyword')
      const keyword = keywordParam?.value || ''

      if (!keyword) {
        return {
          messageVersion: '1.0',
          response: {
            actionGroup,
            apiPath,
            httpMethod: 'POST',
            httpStatusCode: 400,
            responseBody: {
              'application/json': {
                body: JSON.stringify({ success: false, message: '缺少 keyword 参数', items: [] }),
              },
            },
          },
        }
      }

      const result = await searchGoogleNews(keyword)

      return {
        messageVersion: '1.0',
        response: {
          actionGroup,
          apiPath,
          httpMethod: 'POST',
          httpStatusCode: 200,
          responseBody: {
            'application/json': {
              body: result,
            },
          },
        },
      }
    }

    // Unknown action
    return {
      messageVersion: '1.0',
      response: {
        actionGroup,
        apiPath,
        httpMethod: 'POST',
        httpStatusCode: 404,
        responseBody: {
          'application/json': {
            body: JSON.stringify({ success: false, message: 'Unknown action', items: [] }),
          },
        },
      },
    }
  } catch (error: any) {
    console.error('[ACTION GROUP] Handler error:', error)
    return {
      messageVersion: '1.0',
      response: {
        actionGroup,
        apiPath,
        httpMethod: 'POST',
        httpStatusCode: 500,
        responseBody: {
          'application/json': {
            body: JSON.stringify({ success: false, message: error.message, items: [] }),
          },
        },
      },
    }
  }
}
