import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
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
    let items: any[] = []

    if (user.role === 'specialist') {
      // Specialist: query each assigned industry
      const assignedIndustries = user.assignedIndustries || []
      for (const industryId of assignedIndustries) {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.NEWS,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
              ':pk': `INDUSTRY#${industryId}`,
            },
          })
        )
        items.push(...(result.Items || []))
      }
    } else {
      // Admin: scan all news
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAMES.NEWS,
        })
      )
      items = result.Items || []
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
      PK: `INDUSTRY#${industryId}`,
      SK: `${publishedAt || now}#NEWS#${newsId}`,
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

    // Find existing news by scanning (since we don't know the SK)
    let existing: any = null
    let existingIndustryId: string = ''
    let existingSK: string = ''

    if (user.role === 'specialist') {
      // Specialist: query each assigned industry
      const assignedIndustries = user.assignedIndustries || []
      for (const industryId of assignedIndustries) {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.NEWS,
            KeyConditionExpression: 'PK = :pk',
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: {
              ':pk': `INDUSTRY#${industryId}`,
              ':id': newsId,
            },
          })
        )
        if (result.Items && result.Items.length > 0) {
          existing = result.Items[0]
          existingIndustryId = industryId
          existingSK = existing.SK
          break
        }
      }
    } else {
      // Admin: scan all
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAMES.NEWS,
          FilterExpression: 'id = :id',
          ExpressionAttributeValues: {
            ':id': newsId,
          },
        })
      )
      if (result.Items && result.Items.length > 0) {
        existing = result.Items[0]
        existingIndustryId = existing.industryId
        existingSK = existing.SK
      }
    }

    if (!existing) {
      return errorResponse('NOT_FOUND', '新闻不存在', 404)
    }

    // Check industry access for specialist
    if (!hasIndustryAccess(user, existingIndustryId)) {
      return errorResponse('FORBIDDEN', '您没有权限修改该行业的新闻', 403)
    }

    const now = new Date().toISOString()
    const newPublishedAt = publishedAt || existing.publishedAt
    const newSK = `${newPublishedAt}#NEWS#${newsId}`

    // If publishedAt changed, we need to delete old item and create new one
    if (newSK !== existingSK) {
      // Delete old item
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.NEWS,
          Key: { PK: `INDUSTRY#${existingIndustryId}`, SK: existingSK },
        })
      )
    }

    const updatedItem = {
      PK: `INDUSTRY#${existingIndustryId}`,
      SK: newSK,
      id: newsId,
      industryId: existingIndustryId,
      title: title || existing.title,
      summary: summary || existing.summary,
      content: content !== undefined ? content : existing.content,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      externalUrl: externalUrl !== undefined ? externalUrl : existing.externalUrl,
      author: author || existing.author,
      publishedAt: newPublishedAt,
      createdAt: existing.createdAt,
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
