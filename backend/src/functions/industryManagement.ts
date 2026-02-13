import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { Industry } from '../types'
import { 
  checkIndustryHasSubIndustries,
  getItemWithVersion,
  createOptimisticLockCondition,
  addVersionToUpdate,
} from '../utils/consistency'
import { randomUUID } from 'crypto'

function generateId(): string {
  return randomUUID()
}

/**
 * List all industries
 * GET /admin/industries
 */
export async function listIndustries(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
      },
    }))

    const industries: Industry[] = (result.Items || []).map(item => ({
      id: item.id,
      name: item.name,
      definition: item.definition,
      isVisible: item.isVisible,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
    }))

    return successResponse(industries)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error listing industries:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业列表失败', 500)
  }
}

/**
 * Create a new industry
 * POST /admin/industries
 */
export async function createIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const body = JSON.parse(event.body || '{}')
    const { name, definition } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '行业名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (!definition || typeof definition !== 'string' || definition.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '行业定义不能为空', 400, { field: 'definition', constraint: 'required' })
    }

    const id = generateId()
    const now = new Date().toISOString()

    const industry: Industry = {
      id,
      name: name.trim(),
      definition: definition.trim(),
      isVisible: true,
      createdAt: now,
      updatedAt: now,
      createdBy: user!.userId,
    }

    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      Item: {
        PK: `INDUSTRY#${id}`,
        SK: 'METADATA',
        ...industry,
        version: 0, // Initialize version for optimistic locking
      },
    }))

    return successResponse(industry, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error creating industry:', error)
    return errorResponse('INTERNAL_ERROR', '创建行业失败', 500)
  }
}

/**
 * Update an existing industry (with optimistic locking)
 * PUT /admin/industries/{id}
 */
export async function updateIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const industryId = event.pathParameters?.id
    if (!industryId) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { name, definition } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '行业名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (definition !== undefined && (typeof definition !== 'string' || definition.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '行业定义不能为空', 400, { field: 'definition', constraint: 'required' })
    }

    // Get current item with version for optimistic locking
    const { item: existing, version: currentVersion } = await getItemWithVersion(
      TABLE_NAMES.INDUSTRIES,
      { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' }
    )

    const now = new Date().toISOString()
    
    // Build update expression
    const updateExpressions: string[] = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, any> = {}
    
    if (name !== undefined) {
      updateExpressions.push('#name = :name')
      expressionAttributeNames['#name'] = 'name'
      expressionAttributeValues[':name'] = name.trim()
    }
    
    if (definition !== undefined) {
      updateExpressions.push('#definition = :definition')
      expressionAttributeNames['#definition'] = 'definition'
      expressionAttributeValues[':definition'] = definition.trim()
    }
    
    updateExpressions.push('#updatedAt = :updatedAt')
    expressionAttributeNames['#updatedAt'] = 'updatedAt'
    expressionAttributeValues[':updatedAt'] = now
    
    // Add version increment
    const { updateExpression, expressionAttributeValues: finalValues } = addVersionToUpdate(
      `SET ${updateExpressions.join(', ')}`,
      expressionAttributeValues,
      currentVersion
    )
    
    // Add optimistic lock condition
    const lockCondition = createOptimisticLockCondition(currentVersion)
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: {
          ...finalValues,
          ...lockCondition.ExpressionAttributeValues,
        },
        ConditionExpression: lockCondition.ConditionExpression,
        ReturnValues: 'ALL_NEW',
      }))
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return errorResponse('CONFLICT', '数据已被其他用户修改，请刷新后重试', 409)
      }
      throw error
    }

    // Fetch updated item
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
    }))

    const updated: Industry = {
      id: result.Item!.id,
      name: result.Item!.name,
      definition: result.Item!.definition,
      isVisible: result.Item!.isVisible,
      createdAt: result.Item!.createdAt,
      updatedAt: result.Item!.updatedAt,
      createdBy: result.Item!.createdBy,
    }

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    if (error.message === 'Item not found') {
      return errorResponse('NOT_FOUND', '行业不存在', 404)
    }
    console.error('Error updating industry:', error)
    return errorResponse('INTERNAL_ERROR', '更新行业失败', 500)
  }
}

/**
 * Delete an industry (with referential integrity check)
 * DELETE /admin/industries/{id}
 */
export async function deleteIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const industryId = event.pathParameters?.id
    if (!industryId) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)
    }

    // Check if industry exists
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
    }))

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '行业不存在', 404)
    }

    // Check for sub-industries referencing this industry using consistency utility
    const hasSubIndustries = await checkIndustryHasSubIndustries(industryId, TABLE_NAMES.SUB_INDUSTRIES)
    
    if (hasSubIndustries) {
      return errorResponse(
        'CONFLICT',
        '该行业包含子行业，无法删除。请先删除所有子行业。',
        409,
        { dependency: 'sub-industries' }
      )
    }

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
    }))

    return successResponse({ message: '行业删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error deleting industry:', error)
    return errorResponse('INTERNAL_ERROR', '删除行业失败', 500)
  }
}

/**
 * Set industry visibility
 * PATCH /admin/industries/{id}/visibility
 */
export async function setIndustryVisibility(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const industryId = event.pathParameters?.id
    if (!industryId) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { isVisible } = body

    if (typeof isVisible !== 'boolean') {
      return errorResponse('VALIDATION_ERROR', 'isVisible必须是布尔值', 400, { field: 'isVisible', constraint: 'type' })
    }

    // Check if industry exists
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
    }))

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '行业不存在', 404)
    }

    const now = new Date().toISOString()
    const updated: Industry = {
      ...existing.Item as unknown as Industry,
      isVisible,
      updatedAt: now,
    }

    await docClient.send(new PutCommand({
      TableName: TABLE_NAMES.INDUSTRIES,
      Item: {
        PK: `INDUSTRY#${industryId}`,
        SK: 'METADATA',
        ...updated,
      },
    }))

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error setting industry visibility:', error)
    return errorResponse('INTERNAL_ERROR', '设置行业可见性失败', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // GET /admin/industries
    if (method === 'GET' && (path === '/admin/industries' || path === '/admin/industries/')) {
      return await listIndustries(event)
    }

    // POST /admin/industries
    if (method === 'POST' && (path === '/admin/industries' || path === '/admin/industries/')) {
      return await createIndustry(event)
    }

    // PUT /admin/industries/{id}
    if (method === 'PUT' && path.match(/\/admin\/industries\/[^/]+$/)) {
      return await updateIndustry(event)
    }

    // DELETE /admin/industries/{id}
    if (method === 'DELETE' && path.match(/\/admin\/industries\/[^/]+$/)) {
      return await deleteIndustry(event)
    }

    // PATCH /admin/industries/{id}/visibility
    if (method === 'PATCH' && path.match(/\/admin\/industries\/[^/]+\/visibility$/)) {
      return await setIndustryVisibility(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
