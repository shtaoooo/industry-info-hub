import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent } from '../utils/auth'

/**
 * List all news
 * GET /admin/news
 */
async function listNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

    const news = (result.Items || []).map((item) => ({
      id: item.id,
      industryId: item.industryId,
      title: item.title,
      summary: item.summary,
      content: item.content,
      imageUrl: item.imageUrl,
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
async function createNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { industryId, title, summary, content, imageUrl, externalUrl, author, publishedAt } = body

    if (!industryId || !title || !summary || !author) {
      return errorResponse('VALIDATION_ERROR', '缺少必填字段', 400)
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
async function updateNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
async function deleteNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const newsId = event.pathParameters?.id
    if (!newsId) {
      return errorResponse('VALIDATION_ERROR', '新闻ID不能为空', 400)
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
 * Lambda handler
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod
  const path = event.path || event.resource

  try {
    // Verify authentication
    const user = getUserFromEvent(event)
    if (!user || user.role !== 'admin') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }

    // GET /admin/news
    if (method === 'GET' && path === '/admin/news') {
      return await listNews(event)
    }

    // POST /admin/news
    if (method === 'POST' && path === '/admin/news') {
      return await createNews(event)
    }

    // PUT /admin/news/{id}
    if (method === 'PUT' && path.match(/\/admin\/news\/[^/]+$/)) {
      return await updateNews(event)
    }

    // DELETE /admin/news/{id}
    if (method === 'DELETE' && path.match(/\/admin\/news\/[^/]+$/)) {
      return await deleteNews(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
