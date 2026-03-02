import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent, hasIndustryAccess } from '../utils/auth'

/**
 * List all news
 * GET /admin/news
 */
async function listNews(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.NEWS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    let items = result.Items || []

    // Specialist can only see news in their assigned industries
    if (user.role === 'specialist') {
      const assignedIndustries = user.assignedIndustries || []
      items = items.filter((item) => assignedIndustries.includes(item.industryId))
    }

    const news = items.map((item) => ({
      id: item.id,
      industryId: item.industryId,
      title: item.title,
      summary: item.summary,
      content: item.content,
      imageUrl: item.imageUrl,
      externalUrl: item.externalUrl,
      author: item.author,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return successResponse(news)
  } catch (error: any) {
    console.error('Error listing news:', error)
    return errorResponse('INTERNAL_ERROR', '获取新闻列表失败', 500)
  }
}

/**
 * Create news
 * POST /admin/news
 */
async function createNews(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { industryId, title, summary, content, imageUrl, externalUrl, author, publishedAt } = body

    if (!industryId || !title || !summary || !author) {
      return errorResponse('VALIDATION_ERROR', '缺少必填字段', 400)
    }

    // Check industry access for specialist
    if (!hasIndustryAccess(user, industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限管理该行业的新闻', 403)
    }

    // Verify industry exists
    const industry = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
      })
    )

    if (!industry.Item) {
      return errorResponse('NOT_FOUND', '行业不存在', 404)
    }

    const newsId = randomUUID()
    const now = new Date().toISOString()

    const newsItem = {
      PK: `NEWS#${newsId}`,
      SK: 'METADATA',
      id: newsId,
      industryId,
      title,
      summary,
      content: content || '',
      imageUrl: imageUrl || null,
      externalUrl: externalUrl || null,
      author,
      publishedAt: publishedAt || now,
      createdAt: now,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.NEWS,
        Item: newsItem,
      })
    )

    return successResponse(newsItem, 201)
  } catch (error: any) {
    console.error('Error creating news:', error)
    return errorResponse('INTERNAL_ERROR', '创建新闻失败', 500)
  }
}

/**
 * Update news
 * PUT /admin/news/{id}
 */
async function updateNews(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const newsId = event.pathParameters?.id
    if (!newsId) {
      return errorResponse('VALIDATION_ERROR', '新闻ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { title, summary, content, imageUrl, externalUrl, author, publishedAt } = body

    // Get existing news
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.NEWS,
        Key: { PK: `NEWS#${newsId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '新闻不存在', 404)
    }

    // Check industry access for specialist
    if (!hasIndustryAccess(user, existing.Item.industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限修改该行业的新闻', 403)
    }

    const now = new Date().toISOString()
    const updatedItem = {
      ...existing.Item,
      title: title || existing.Item.title,
      summary: summary || existing.Item.summary,
      content: content !== undefined ? content : existing.Item.content,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.Item.imageUrl,
      externalUrl: externalUrl !== undefined ? externalUrl : existing.Item.externalUrl,
      author: author || existing.Item.author,
      publishedAt: publishedAt || existing.Item.publishedAt,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.NEWS,
        Item: updatedItem,
      })
    )

    return successResponse(updatedItem)
  } catch (error: any) {
    console.error('Error updating news:', error)
    return errorResponse('INTERNAL_ERROR', '更新新闻失败', 500)
  }
}

/**
 * Delete news
 * DELETE /admin/news/{id}
 */
async function deleteNews(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const newsId = event.pathParameters?.id
    if (!newsId) {
      return errorResponse('VALIDATION_ERROR', '新闻ID不能为空', 400)
    }

    // Get existing news to check industry access
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.NEWS,
        Key: { PK: `NEWS#${newsId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '新闻不存在', 404)
    }

    // Check industry access for specialist
    if (!hasIndustryAccess(user, existing.Item.industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限删除该行业的新闻', 403)
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.NEWS,
        Key: { PK: `NEWS#${newsId}`, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '新闻已删除' })
  } catch (error: any) {
    console.error('Error deleting news:', error)
    return errorResponse('INTERNAL_ERROR', '删除新闻失败', 500)
  }
}

/**
 * List news feeds for an industry
 * GET /admin/news-feeds?industryId=xxx
 */
async function listNewsFeeds(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.queryStringParameters?.industryId
    if (!industryId) {
      return errorResponse('VALIDATION_ERROR', '缺少industryId参数', 400)
    }

    // Check industry access for specialist
    if (!hasIndustryAccess(user, industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限查看该行业的订阅源', 403)
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.NEWS_FEEDS,
        IndexName: 'IndustryIndex',
        KeyConditionExpression: 'industryId = :industryId',
        ExpressionAttributeValues: {
          ':industryId': industryId,
        },
        ScanIndexForward: false,
      })
    )

    const feeds = (result.Items || []).map((item) => ({
      id: item.id,
      industryId: item.industryId,
      name: item.name,
      url: item.url,
      description: item.description,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
    }))

    return successResponse(feeds)
  } catch (error: any) {
    console.error('Error listing news feeds:', error)
    return errorResponse('INTERNAL_ERROR', '获取订阅源列表失败', 500)
  }
}

/**
 * Create news feed
 * POST /admin/news-feeds
 */
async function createNewsFeed(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { industryId, name, url, description } = body

    if (!industryId || !name || !url) {
      return errorResponse('VALIDATION_ERROR', '缺少必填字段', 400)
    }

    // Check industry access for specialist
    if (!hasIndustryAccess(user, industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限管理该行业的订阅源', 403)
    }

    const feedId = randomUUID()
    const now = new Date().toISOString()

    const feedItem = {
      PK: `INDUSTRY#${industryId}`,
      SK: `FEED#${feedId}`,
      id: feedId,
      industryId,
      name,
      url,
      description: description || '',
      createdAt: now,
      createdBy: user.email,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.NEWS_FEEDS,
        Item: feedItem,
      })
    )

    return successResponse(feedItem, 201)
  } catch (error: any) {
    console.error('Error creating news feed:', error)
    return errorResponse('INTERNAL_ERROR', '创建订阅源失败', 500)
  }
}

/**
 * Delete news feed
 * DELETE /admin/news-feeds/{id}
 */
async function deleteNewsFeed(event: APIGatewayProxyEvent, user: any): Promise<APIGatewayProxyResult> {
  try {
    const feedId = event.pathParameters?.id
    if (!feedId) {
      return errorResponse('VALIDATION_ERROR', '订阅源ID不能为空', 400)
    }

    // Find the feed first to get PK and check access
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.NEWS_FEEDS,
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': feedId,
        },
        Limit: 1,
      })
    )

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return errorResponse('NOT_FOUND', '订阅源不存在', 404)
    }

    const feed = scanResult.Items[0]

    // Check industry access for specialist
    if (!hasIndustryAccess(user, feed.industryId)) {
      return errorResponse('FORBIDDEN', '您没有权限删除该行业的订阅源', 403)
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.NEWS_FEEDS,
        Key: {
          PK: feed.PK,
          SK: feed.SK,
        },
      })
    )

    return successResponse({ message: '订阅源已删除' })
  } catch (error: any) {
    console.error('Error deleting news feed:', error)
    return errorResponse('INTERNAL_ERROR', '删除订阅源失败', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // Verify authentication
    const user = getUserFromEvent(event)
    if (!user || !['admin', 'specialist'].includes(user.role)) {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }

    // News Feeds routes
    // GET /admin/news-feeds?industryId=xxx
    if (method === 'GET' && (path === '/admin/news-feeds' || path === '/admin/news-feeds/')) {
      return await listNewsFeeds(event, user)
    }

    // POST /admin/news-feeds
    if (method === 'POST' && (path === '/admin/news-feeds' || path === '/admin/news-feeds/')) {
      return await createNewsFeed(event, user)
    }

    // DELETE /admin/news-feeds/{id}
    if (method === 'DELETE' && path.match(/\/admin\/news-feeds\/[^/]+$/)) {
      return await deleteNewsFeed(event, user)
    }

    // News routes
    // GET /admin/news
    if (method === 'GET' && (path === '/admin/news' || path === '/admin/news/')) {
      return await listNews(event, user)
    }

    // POST /admin/news
    if (method === 'POST' && (path === '/admin/news' || path === '/admin/news/')) {
      return await createNews(event, user)
    }

    // PUT /admin/news/{id}
    if (method === 'PUT' && path.match(/\/admin\/news\/[^/]+$/)) {
      return await updateNews(event, user)
    }

    // DELETE /admin/news/{id}
    if (method === 'DELETE' && path.match(/\/admin\/news\/[^/]+$/)) {
      return await deleteNews(event, user)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
