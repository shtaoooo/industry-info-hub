import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent } from '../utils/auth'

/**
 * List all blogs
 * GET /admin/blogs
 */
async function listBlogs(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.BLOGS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    const blogs = (result.Items || []).map((item) => ({
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

    return successResponse(blogs)
  } catch (error: any) {
    console.error('Error listing blogs:', error)
    return errorResponse('INTERNAL_ERROR', '获取博客列表失败', 500)
  }
}

/**
 * Create blog
 * POST /admin/blogs
 */
async function createBlog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

    const blogId = randomUUID()
    const now = new Date().toISOString()

    const blogItem = {
      PK: `BLOG#${blogId}`,
      SK: 'METADATA',
      id: blogId,
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
        TableName: TABLE_NAMES.BLOGS,
        Item: blogItem,
      })
    )

    return successResponse(blogItem, 201)
  } catch (error: any) {
    console.error('Error creating blog:', error)
    return errorResponse('INTERNAL_ERROR', '创建博客失败', 500)
  }
}

/**
 * Update blog
 * PUT /admin/blogs/{id}
 */
async function updateBlog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const blogId = event.pathParameters?.id
    if (!blogId) {
      return errorResponse('VALIDATION_ERROR', '博客ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { title, summary, content, imageUrl, externalUrl, author, publishedAt } = body

    // Get existing blog
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.BLOGS,
        Key: { PK: `BLOG#${blogId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '博客不存在', 404)
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
        TableName: TABLE_NAMES.BLOGS,
        Item: updatedItem,
      })
    )

    return successResponse(updatedItem)
  } catch (error: any) {
    console.error('Error updating blog:', error)
    return errorResponse('INTERNAL_ERROR', '更新博客失败', 500)
  }
}

/**
 * Delete blog
 * DELETE /admin/blogs/{id}
 */
async function deleteBlog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const blogId = event.pathParameters?.id
    if (!blogId) {
      return errorResponse('VALIDATION_ERROR', '博客ID不能为空', 400)
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.BLOGS,
        Key: { PK: `BLOG#${blogId}`, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '博客已删除' })
  } catch (error: any) {
    console.error('Error deleting blog:', error)
    return errorResponse('INTERNAL_ERROR', '删除博客失败', 500)
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
    if (!user || !['admin', 'specialist'].includes(user.role)) {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }

    // GET /admin/blogs
    if (method === 'GET' && path === '/admin/blogs') {
      return await listBlogs(event)
    }

    // POST /admin/blogs
    if (method === 'POST' && path === '/admin/blogs') {
      return await createBlog(event)
    }

    // PUT /admin/blogs/{id}
    if (method === 'PUT' && path.match(/\/admin\/blogs\/[^/]+$/)) {
      return await updateBlog(event)
    }

    // DELETE /admin/blogs/{id}
    if (method === 'DELETE' && path.match(/\/admin\/blogs\/[^/]+$/)) {
      return await deleteBlog(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
