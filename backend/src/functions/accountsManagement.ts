import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { getUserFromEvent } from '../utils/auth'

/**
 * List all accounts
 * GET /admin/accounts
 */
async function listAccounts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.ACCOUNTS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    const accounts = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
      logoUrl: item.logoUrl,
      website: item.website,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    return successResponse(accounts)
  } catch (error: any) {
    console.error('Error listing accounts:', error)
    return errorResponse('INTERNAL_ERROR', '获取账户列表失败', 500)
  }
}

/**
 * Create account
 * POST /admin/accounts
 */
async function createAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const { name, type, description, logoUrl, website } = body

    if (!name || !type) {
      return errorResponse('VALIDATION_ERROR', '缺少必填字段', 400)
    }

    if (!['customer', 'partner', 'vendor'].includes(type)) {
      return errorResponse('VALIDATION_ERROR', '账户类型无效', 400)
    }

    const accountId = randomUUID()
    const now = new Date().toISOString()

    const accountItem = {
      PK: `ACCOUNT#${accountId}`,
      SK: 'METADATA',
      id: accountId,
      name,
      type,
      description: description || null,
      logoUrl: logoUrl || null,
      website: website || null,
      createdAt: now,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.ACCOUNTS,
        Item: accountItem,
      })
    )

    return successResponse(accountItem, 201)
  } catch (error: any) {
    console.error('Error creating account:', error)
    return errorResponse('INTERNAL_ERROR', '创建账户失败', 500)
  }
}

/**
 * Update account
 * PUT /admin/accounts/{id}
 */
async function updateAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const accountId = event.pathParameters?.id
    if (!accountId) {
      return errorResponse('VALIDATION_ERROR', '账户ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { name, type, description, logoUrl, website } = body

    // Get existing account
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.ACCOUNTS,
        Key: { PK: `ACCOUNT#${accountId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '账户不存在', 404)
    }

    if (type && !['customer', 'partner', 'vendor'].includes(type)) {
      return errorResponse('VALIDATION_ERROR', '账户类型无效', 400)
    }

    const now = new Date().toISOString()
    const updatedItem = {
      ...existing.Item,
      name: name || existing.Item.name,
      type: type || existing.Item.type,
      description: description !== undefined ? description : existing.Item.description,
      logoUrl: logoUrl !== undefined ? logoUrl : existing.Item.logoUrl,
      website: website !== undefined ? website : existing.Item.website,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.ACCOUNTS,
        Item: updatedItem,
      })
    )

    return successResponse(updatedItem)
  } catch (error: any) {
    console.error('Error updating account:', error)
    return errorResponse('INTERNAL_ERROR', '更新账户失败', 500)
  }
}

/**
 * Delete account
 * DELETE /admin/accounts/{id}
 */
async function deleteAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const accountId = event.pathParameters?.id
    if (!accountId) {
      return errorResponse('VALIDATION_ERROR', '账户ID不能为空', 400)
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.ACCOUNTS,
        Key: { PK: `ACCOUNT#${accountId}`, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '账户已删除' })
  } catch (error: any) {
    console.error('Error deleting account:', error)
    return errorResponse('INTERNAL_ERROR', '删除账户失败', 500)
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

    // GET /admin/accounts
    if (method === 'GET' && path === '/admin/accounts') {
      return await listAccounts(event)
    }

    // POST /admin/accounts
    if (method === 'POST' && path === '/admin/accounts') {
      return await createAccount(event)
    }

    // PUT /admin/accounts/{id}
    if (method === 'PUT' && path.match(/\/admin\/accounts\/[^/]+$/)) {
      return await updateAccount(event)
    }

    // DELETE /admin/accounts/{id}
    if (method === 'DELETE' && path.match(/\/admin\/accounts\/[^/]+$/)) {
      return await deleteAccount(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
