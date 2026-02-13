import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { SubIndustry } from '../types'
import { randomUUID } from 'crypto'

function generateId(): string {
  return randomUUID()
}

/**
 * List all sub-industries or sub-industries for a specific industry
 * GET /admin/sub-industries
 * GET /admin/industries/{industryId}/sub-industries
 */
export async function listSubIndustries(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const industryId = event.pathParameters?.industryId

    if (industryId) {
      // Get sub-industries for a specific industry
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `INDUSTRY#${industryId}`,
          },
        })
      )

      const subIndustries: SubIndustry[] = (result.Items || []).map((item) => ({
        id: item.id,
        industryId: item.industryId,
        name: item.name,
        definition: item.definition,
        typicalGlobalCompanies: item.typicalGlobalCompanies || [],
        typicalChineseCompanies: item.typicalChineseCompanies || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))

      return successResponse(subIndustries)
    } else {
      // Get all sub-industries (scan all industries)
      // This is less efficient but needed for admin overview
      const industries = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAMES.INDUSTRIES,
          FilterExpression: 'SK = :sk',
          ExpressionAttributeValues: {
            ':sk': 'METADATA',
          },
        })
      )

      const allSubIndustries: SubIndustry[] = []

      // For each industry, get its sub-industries
      for (const industry of industries.Items || []) {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.SUB_INDUSTRIES,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
              ':pk': `INDUSTRY#${industry.id}`,
            },
          })
        )

        const subIndustries = (result.Items || []).map((item) => ({
          id: item.id,
          industryId: item.industryId,
          name: item.name,
          definition: item.definition,
          typicalGlobalCompanies: item.typicalGlobalCompanies || [],
          typicalChineseCompanies: item.typicalChineseCompanies || [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }))

        allSubIndustries.push(...subIndustries)
      }

      return successResponse(allSubIndustries)
    }
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error listing sub-industries:', error)
    return errorResponse('INTERNAL_ERROR', '获取子行业列表失败', 500)
  }
}

/**
 * Create a new sub-industry
 * POST /admin/sub-industries
 */
export async function createSubIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const body = JSON.parse(event.body || '{}')
    const { industryId, name, definition, typicalGlobalCompanies, typicalChineseCompanies } = body

    if (!industryId || typeof industryId !== 'string' || industryId.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400, { field: 'industryId', constraint: 'required' })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '子行业名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (!definition || typeof definition !== 'string' || definition.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '子行业定义不能为空', 400, { field: 'definition', constraint: 'required' })
    }

    // Check if parent industry exists
    const industryExists = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
      })
    )

    if (!industryExists.Item) {
      return errorResponse('NOT_FOUND', '父行业不存在', 404)
    }

    const id = generateId()
    const now = new Date().toISOString()

    const subIndustry: SubIndustry = {
      id,
      industryId,
      name: name.trim(),
      definition: definition.trim(),
      typicalGlobalCompanies: Array.isArray(typicalGlobalCompanies) ? typicalGlobalCompanies : [],
      typicalChineseCompanies: Array.isArray(typicalChineseCompanies) ? typicalChineseCompanies : [],
      createdAt: now,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Item: {
          PK: `INDUSTRY#${industryId}`,
          SK: `SUBINDUSTRY#${id}`,
          ...subIndustry,
        },
      })
    )

    return successResponse(subIndustry, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error creating sub-industry:', error)
    return errorResponse('INTERNAL_ERROR', '创建子行业失败', 500)
  }
}

/**
 * Update an existing sub-industry
 * PUT /admin/sub-industries/{id}
 */
export async function updateSubIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) {
      return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { name, definition, typicalGlobalCompanies, typicalChineseCompanies } = body

    // Find the sub-industry (we need to scan since we don't know the industryId)
    let existingSubIndustry: any = null
    let existingIndustryId: string = ''

    // Query all industries to find the sub-industry
    const industries = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const industry of industries.Items || []) {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          Key: {
            PK: `INDUSTRY#${industry.id}`,
            SK: `SUBINDUSTRY#${subIndustryId}`,
          },
        })
      )

      if (result.Item) {
        existingSubIndustry = result.Item
        existingIndustryId = industry.id
        break
      }
    }

    if (!existingSubIndustry) {
      return errorResponse('NOT_FOUND', '子行业不存在', 404)
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '子行业名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (definition !== undefined && (typeof definition !== 'string' || definition.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '子行业定义不能为空', 400, { field: 'definition', constraint: 'required' })
    }

    const now = new Date().toISOString()
    const updated: SubIndustry = {
      id: subIndustryId,
      industryId: existingIndustryId,
      name: name !== undefined ? name.trim() : existingSubIndustry.name,
      definition: definition !== undefined ? definition.trim() : existingSubIndustry.definition,
      typicalGlobalCompanies:
        typicalGlobalCompanies !== undefined ? typicalGlobalCompanies : existingSubIndustry.typicalGlobalCompanies || [],
      typicalChineseCompanies:
        typicalChineseCompanies !== undefined ? typicalChineseCompanies : existingSubIndustry.typicalChineseCompanies || [],
      createdAt: existingSubIndustry.createdAt,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Item: {
          PK: `INDUSTRY#${existingIndustryId}`,
          SK: `SUBINDUSTRY#${subIndustryId}`,
          ...updated,
        },
      })
    )

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error updating sub-industry:', error)
    return errorResponse('INTERNAL_ERROR', '更新子行业失败', 500)
  }
}

/**
 * Delete a sub-industry (with referential integrity check)
 * DELETE /admin/sub-industries/{id}
 */
export async function deleteSubIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) {
      return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)
    }

    // Find the sub-industry
    let existingIndustryId: string = ''
    let found = false

    const industries = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const industry of industries.Items || []) {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          Key: {
            PK: `INDUSTRY#${industry.id}`,
            SK: `SUBINDUSTRY#${subIndustryId}`,
          },
        })
      )

      if (result.Item) {
        existingIndustryId = industry.id
        found = true
        break
      }
    }

    if (!found) {
      return errorResponse('NOT_FOUND', '子行业不存在', 404)
    }

    // Check for use cases referencing this sub-industry
    const useCases = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USE_CASES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `SUBINDUSTRY#${subIndustryId}`,
        },
        Limit: 1,
      })
    )

    if (useCases.Items && useCases.Items.length > 0) {
      return errorResponse('CONFLICT', '该子行业包含用例，无法删除。请先删除所有用例。', 409, { dependency: 'use-cases' })
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Key: {
          PK: `INDUSTRY#${existingIndustryId}`,
          SK: `SUBINDUSTRY#${subIndustryId}`,
        },
      })
    )

    return successResponse({ message: '子行业删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error deleting sub-industry:', error)
    return errorResponse('INTERNAL_ERROR', '删除子行业失败', 500)
  }
}

/**
 * Move a sub-industry to a different parent industry
 * PATCH /admin/sub-industries/{id}/move
 */
export async function moveSubIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) {
      return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)
    }

    const body = JSON.parse(event.body || '{}')
    const { newIndustryId } = body

    if (!newIndustryId || typeof newIndustryId !== 'string') {
      return errorResponse('VALIDATION_ERROR', '新行业ID不能为空', 400, { field: 'newIndustryId', constraint: 'required' })
    }

    // Check if new parent industry exists
    const newIndustryExists = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: `INDUSTRY#${newIndustryId}`, SK: 'METADATA' },
      })
    )

    if (!newIndustryExists.Item) {
      return errorResponse('NOT_FOUND', '目标行业不存在', 404)
    }

    // Find the sub-industry
    let existingSubIndustry: any = null
    let oldIndustryId: string = ''

    const industries = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const industry of industries.Items || []) {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          Key: {
            PK: `INDUSTRY#${industry.id}`,
            SK: `SUBINDUSTRY#${subIndustryId}`,
          },
        })
      )

      if (result.Item) {
        existingSubIndustry = result.Item
        oldIndustryId = industry.id
        break
      }
    }

    if (!existingSubIndustry) {
      return errorResponse('NOT_FOUND', '子行业不存在', 404)
    }

    // If already in the target industry, no need to move
    if (oldIndustryId === newIndustryId) {
      return successResponse({ message: '子行业已在目标行业中', subIndustry: existingSubIndustry })
    }

    // Delete from old location
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Key: {
          PK: `INDUSTRY#${oldIndustryId}`,
          SK: `SUBINDUSTRY#${subIndustryId}`,
        },
      })
    )

    // Create in new location
    const now = new Date().toISOString()
    const movedSubIndustry: SubIndustry = {
      ...existingSubIndustry,
      industryId: newIndustryId,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Item: {
          PK: `INDUSTRY#${newIndustryId}`,
          SK: `SUBINDUSTRY#${subIndustryId}`,
          ...movedSubIndustry,
        },
      })
    )

    return successResponse(movedSubIndustry)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error moving sub-industry:', error)
    return errorResponse('INTERNAL_ERROR', '移动子行业失败', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // GET /admin/sub-industries
    if (method === 'GET' && (path === '/admin/sub-industries' || path === '/admin/sub-industries/')) {
      return await listSubIndustries(event)
    }

    // GET /admin/industries/{industryId}/sub-industries
    if (method === 'GET' && path.match(/\/admin\/industries\/[^/]+\/sub-industries$/)) {
      return await listSubIndustries(event)
    }

    // POST /admin/sub-industries
    if (method === 'POST' && (path === '/admin/sub-industries' || path === '/admin/sub-industries/')) {
      return await createSubIndustry(event)
    }

    // PUT /admin/sub-industries/{id}
    if (method === 'PUT' && path.match(/\/admin\/sub-industries\/[^/]+$/)) {
      return await updateSubIndustry(event)
    }

    // DELETE /admin/sub-industries/{id}
    if (method === 'DELETE' && path.match(/\/admin\/sub-industries\/[^/]+$/)) {
      return await deleteSubIndustry(event)
    }

    // PATCH /admin/sub-industries/{id}/move
    if (method === 'PATCH' && path.match(/\/admin\/sub-industries\/[^/]+\/move$/)) {
      return await moveSubIndustry(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
