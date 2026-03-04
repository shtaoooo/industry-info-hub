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

    const items = parseRssItems(rawContent)
    console.log(`[ACTION] Parsed ${items.length} news items`)

    if (items.length === 0) {
      return JSON.stringify({ success: false, message: '未找到相关新闻', items: [] })
    }

    return JSON.stringify({
      success: true,
      source: 'Google News',
      message: `从 Google News 找到 ${items.length} 条新闻`,
      items: items.slice(0, 20),
    })
  } catch (error: any) {
    console.error('[ACTION] searchGoogleNews error:', error)
    return JSON.stringify({
      success: false,
      source: 'Google News',
      message: `搜索失败: ${error.message}`,
      items: [],
    })
  }
}

/**
 * Fetch RSS feed from custom URL
 */
async function fetchRssFeed(url: string): Promise<string> {
  try {
    console.log(`[ACTION] fetchRssFeed called with url: ${url}`)

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    const rawContent = await httpGet(url, headers)

    if (!rawContent || rawContent.length < 100) {
      console.log(`[ACTION] Content too short: ${rawContent.length} bytes`)
      return JSON.stringify({ success: false, message: '无法获取 RSS 内容', items: [] })
    }

    console.log(`[ACTION] Fetched ${rawContent.length} bytes from ${url}`)

    const items = parseRssItems(rawContent)
    console.log(`[ACTION] Parsed ${items.length} items from RSS feed`)

    if (items.length === 0) {
      return JSON.stringify({ success: false, message: 'RSS feed 中没有内容', items: [] })
    }

    return JSON.stringify({
      success: true,
      source: url,
      message: `从 RSS feed 找到 ${items.length} 条内容`,
      items: items.slice(0, 20),
    })
  } catch (error: any) {
    console.error('[ACTION] fetchRssFeed error:', error)
    return JSON.stringify({
      success: false,
      source: url,
      message: `获取失败: ${error.message}`,
      items: [],
    })
  }
}

/**
 * Search Google News with multiple keywords and optional date filtering
 */
async function searchGoogleNewsAdvanced(
  keywords: string[],
  daysBack?: number
): Promise<string> {
  try {
    console.log(`[ACTION] searchGoogleNewsAdvanced called with keywords: ${keywords.join(', ')}, daysBack: ${daysBack || 'all'}`)

    const allResults: any[] = []
    const seenUrls = new Set<string>()

    // Search for each keyword
    for (const keyword of keywords.slice(0, 5)) {
      // Limit to 5 keywords
      const encodedQuery = encodeURIComponent(keyword)
      
      // Google News RSS supports 'when' parameter for time filtering
      // when=7d means last 7 days, when=1h means last hour, etc.
      let googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
      
      // Add time filter if specified
      if (daysBack && daysBack > 0) {
        googleNewsUrl += `&when=${daysBack}d`
      }

      console.log(`[ACTION] Fetching: ${googleNewsUrl}`)

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }

      try {
        const rawContent = await httpGet(googleNewsUrl, headers)

        if (rawContent && rawContent.length > 100) {
          const items = parseRssItems(rawContent)
          console.log(`[ACTION] Keyword "${keyword}": found ${items.length} items`)

          // Deduplicate by URL
          for (const item of items) {
            if (!seenUrls.has(item.link)) {
              seenUrls.add(item.link)
              allResults.push({
                ...item,
                searchKeyword: keyword,
                source: 'Google News',
              })
            }
          }
        }
      } catch (error: any) {
        console.error(`[ACTION] Failed to fetch keyword "${keyword}":`, error.message)
        // Continue with other keywords
      }
    }

    // Additional date filtering on client side if needed
    if (daysBack && daysBack > 0) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)

      const filtered = allResults.filter((item) => {
        if (!item.pubDate) return true // Keep items without date
        const itemDate = new Date(item.pubDate)
        return itemDate >= cutoffDate
      })

      console.log(`[ACTION] Date filtered: ${allResults.length} -> ${filtered.length} items`)
      allResults.length = 0
      allResults.push(...filtered)
    }

    // Sort by date (newest first)
    allResults.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime()
      const dateB = new Date(b.pubDate || 0).getTime()
      return dateB - dateA
    })

    if (allResults.length === 0) {
      return JSON.stringify({
        success: false,
        message: `未找到关于 ${keywords.join('、')} 的新闻`,
        items: [],
      })
    }

    return JSON.stringify({
      success: true,
      source: 'Google News',
      message: `从 Google News 找到 ${allResults.length} 条相关新闻（搜索关键词: ${keywords.join('、')}）`,
      items: allResults.slice(0, 30),
    })
  } catch (error: any) {
    console.error('[ACTION] searchGoogleNewsAdvanced error:', error)
    return JSON.stringify({
      success: false,
      source: 'Google News',
      message: `搜索失败: ${error.message}`,
      items: [],
    })
  }
}
async function searchMultipleSources(keyword: string, rssFeedUrls?: string[]): Promise<string> {
  try {
    console.log(`[ACTION] searchMultipleSources called with keyword: ${keyword}, feeds: ${rssFeedUrls?.length || 0}`)

    const results: any[] = []

    // Always search Google News
    const googleResult = await searchGoogleNews(keyword)
    const googleData = JSON.parse(googleResult)
    if (googleData.success && googleData.items.length > 0) {
      results.push(...googleData.items.map((item: any) => ({ ...item, source: 'Google News' })))
    }

    // Search custom RSS feeds if provided
    if (rssFeedUrls && rssFeedUrls.length > 0) {
      for (const url of rssFeedUrls.slice(0, 3)) {
        // Limit to 3 custom feeds
        const rssResult = await fetchRssFeed(url)
        const rssData = JSON.parse(rssResult)
        if (rssData.success && rssData.items.length > 0) {
          results.push(...rssData.items.map((item: any) => ({ ...item, customSource: url })))
        }
      }
    }

    if (results.length === 0) {
      return JSON.stringify({
        success: false,
        message: '所有来源都未找到相关新闻',
        items: [],
      })
    }

    // Sort by date (newest first) and limit to 30 items
    results.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime()
      const dateB = new Date(b.pubDate || 0).getTime()
      return dateB - dateA
    })

    return JSON.stringify({
      success: true,
      message: `从 ${rssFeedUrls ? rssFeedUrls.length + 1 : 1} 个来源找到 ${results.length} 条新闻`,
      items: results.slice(0, 30),
    })
  } catch (error: any) {
    console.error('[ACTION] searchMultipleSources error:', error)
    return JSON.stringify({
      success: false,
      message: `搜索失败: ${error.message}`,
      items: [],
    })
  }
}

/**
 * Lambda handler for Bedrock Agent Action Group
 * Handles multiple actions for news search
 */
export async function handler(event: any): Promise<any> {
  console.log('[ACTION GROUP] Event:', JSON.stringify(event, null, 2))

  const actionGroup = event.actionGroup
  const apiPath = event.apiPath
  
  // Extract parameters from requestBody if available, otherwise use parameters array
  let parameters = event.parameters || []
  
  if (event.requestBody?.content?.['application/json']?.properties) {
    parameters = event.requestBody.content['application/json'].properties
  }

  console.log(`[ACTION GROUP] Action: ${actionGroup}, Path: ${apiPath}`)
  console.log(`[ACTION GROUP] Parameters:`, JSON.stringify(parameters, null, 2))

  try {
    // Action 1: Search Google News
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

    // Action 2: Fetch custom RSS feed
    if (apiPath === '/fetchRssFeed') {
      const urlParam = parameters.find((p: any) => p.name === 'url')
      const url = urlParam?.value || ''

      if (!url) {
        return {
          messageVersion: '1.0',
          response: {
            actionGroup,
            apiPath,
            httpMethod: 'POST',
            httpStatusCode: 400,
            responseBody: {
              'application/json': {
                body: JSON.stringify({ success: false, message: '缺少 url 参数', items: [] }),
              },
            },
          },
        }
      }

      const result = await fetchRssFeed(url)

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

    // Action 3: Search Google News with multiple keywords and date filter
    if (apiPath === '/searchGoogleNewsAdvanced') {
      const keywordsParam = parameters.find((p: any) => p.name === 'keywords')
      const daysBackParam = parameters.find((p: any) => p.name === 'daysBack')

      const keywords = keywordsParam?.value ? JSON.parse(keywordsParam.value) : []
      const daysBack = daysBackParam?.value ? parseInt(daysBackParam.value) : undefined

      if (!keywords || keywords.length === 0) {
        return {
          messageVersion: '1.0',
          response: {
            actionGroup,
            apiPath,
            httpMethod: 'POST',
            httpStatusCode: 400,
            responseBody: {
              'application/json': {
                body: JSON.stringify({ success: false, message: '缺少 keywords 参数', items: [] }),
              },
            },
          },
        }
      }

      const result = await searchGoogleNewsAdvanced(keywords, daysBack)

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

    // Action 4: Search multiple sources
    if (apiPath === '/searchMultipleSources') {
      const keywordParam = parameters.find((p: any) => p.name === 'keyword')
      const rssFeedsParam = parameters.find((p: any) => p.name === 'rssFeedUrls')

      const keyword = keywordParam?.value || ''
      const rssFeedUrls = rssFeedsParam?.value ? JSON.parse(rssFeedsParam.value) : []

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

      const result = await searchMultipleSources(keyword, rssFeedUrls)

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
