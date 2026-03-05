import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { SubIndustry, Company } from '../types'
import { randomUUID } from 'crypto'

function generateId(): string {
  return randomUUID()
}

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '')
}

async function findCompanyByName(name: string): Promise<Company | null> {
  const normalizedName = normalizeCompanyName(name)
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.COMPANIES,
        IndexName: 'NameIndex',
        KeyConditionExpression: 'normalizedName = :name',
        ExpressionAttributeValues: { ':name': normalizedName },
        Limit: 1,
      })
    )
    return result.Items && result.Items.length > 0 ? (result.Items[0] as Company) : null
  } catch (error) {
    console.error('Error finding company:', error)
    return null
  }
}

async function saveCompanyIfNotExists(name: string, type: 'chinese' | 'global'): Promise<void> {
  const existing = await findCompanyByName(name)
  if (existing) return

  const id = generateId()
  const now = new Date().toISOString()
  const normalizedName = normalizeCompanyName(name)

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.COMPANIES,
      Item: {
        PK: `COMPANY#${id}`,
        SK: 'METADATA',
        id,
        name: name.trim(),
        normalizedName,
        type,
        createdAt: now,
        updatedAt: now,
      },
    })
  )
}

async function processAndSaveCompanies(companies: string[], type: 'chinese' | 'global'): Promise<void> {
  for (const name of companies) {
    if (name && name.trim().length > 0) {
      await saveCompanyIfNotExists(name.trim(), type)
    }
  }
}

/**
 * Get sub-industry by id directly (PK=id, SK=METADATA)
 */
async function getSubIndustryById(subIndustryId: string): Promise<any | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.SUB_INDUSTRIES,
      Key: { PK: subIndustryId, SK: 'METADATA' },
    })
  )
  return result.Item || null
}

/**
 * List all sub-industries or sub-industries for a specific industry
 * GET /admin/sub-industries
 * GET /admin/industries/{industryId}/sub-industries
 * Uses IndustryIndex GSI: PK=industryId, SK=priority
 */
export async function listSubIndustries(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const industryId = event.pathParameters?.industryId

    const mapItem = (item: any): SubIndustry => ({
      id: item.id,
      industryId: item.industryId,
      name: item.name,
      definition: item.definition,
      definitionCn: item.definitionCn,
      typicalGlobalCompanies: item.typicalGlobalCompanies || [],
      typicalChineseCompanies: item.typicalChineseCompanies || [],
      priority: item.priority,
      level: item.level,
      parentSubIndustryId: item.parentSubIndustryId,
      childrenIds: item.childrenIds,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })

    if (industryId) {
      if (user!.role === 'specialist') {
        const assignedIndustries = user!.assignedIndustries || []
        if (!assignedIndustries.includes(industryId)) return successResponse([])
      }

      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          IndexName: 'IndustryIndex',
          KeyConditionExpression: 'industryId = :industryId',
          ExpressionAttributeValues: { ':industryId': industryId },
          ScanIndexForward: false,
        })
      )
      return successResponse((result.Items || []).map(mapItem))
    }

    // Get all sub-industries for admin/specialist
    if (user!.role === 'specialist') {
      const assignedIndustries = user!.assignedIndustries || []
      const allSubIndustries: SubIndustry[] = []

      for (const indId of assignedIndustries) {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.SUB_INDUSTRIES,
            IndexName: 'IndustryIndex',
            KeyConditionExpression: 'industryId = :industryId',
            ExpressionAttributeValues: { ':industryId': indId },
            ScanIndexForward: false,
          })
        )
        allSubIndustries.push(...(result.Items || []).map(mapItem))
      }
      return successResponse(allSubIndustries)
    }

    // Admin: scan all
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'METADATA' },
      })
    )
    return successResponse((result.Items || []).map(mapItem))
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error listing sub-industries:', error)
    return errorResponse('INTERNAL_ERROR', '获取子行业列表失败', 500)
  }
}

/**
 * Create a new sub-industry
 * POST /admin/sub-industries
 * PK: id, SK: METADATA
 */
export async function createSubIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const body = JSON.parse(event.body || '{}')
    const { industryId, name, definition, definitionCn, typicalGlobalCompanies, typicalChineseCompanies, priority, level, parentSubIndustryId } = body

    if (!industryId || typeof industryId !== 'string' || industryId.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400, { field: 'industryId', constraint: 'required' })
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '子行业名称不能为空', 400, { field: 'name', constraint: 'required' })
    }
    if (!definition || typeof definition !== 'string' || definition.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '子行业定义不能为空', 400, { field: 'definition', constraint: 'required' })
    }

    const validLevels = ['Tier2-individual', 'Tier2-Group', 'Tier3']
    const subIndustryLevel = level && validLevels.includes(level) ? level : 'Tier2-individual'

    if (subIndustryLevel === 'Tier3') {
      if (!parentSubIndustryId || typeof parentSubIndustryId !== 'string') {
        return errorResponse('VALIDATION_ERROR', 'Tier3子行业必须指定父级Tier2子行业', 400, { field: 'parentSubIndustryId', constraint: 'required' })
      }

      const parentItem = await getSubIndustryById(parentSubIndustryId)
      if (!parentItem) return errorResponse('NOT_FOUND', '父级Tier2子行业不存在', 404)

      const id = generateId()
      const now = new Date().toISOString()

      // Update parent to Tier2-Group and add child id
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          Item: {
            ...parentItem,
            level: 'Tier2-Group',
            childrenIds: [...(parentItem.childrenIds || []), id],
            updatedAt: now,
          },
        })
      )

      const subIndustry: SubIndustry = {
        id,
        industryId,
        name: name.trim(),
        definition: definition.trim(),
        definitionCn: definitionCn?.trim() || undefined,
        typicalGlobalCompanies: Array.isArray(typicalGlobalCompanies) ? typicalGlobalCompanies : [],
        typicalChineseCompanies: Array.isArray(typicalChineseCompanies) ? typicalChineseCompanies : [],
        priority: typeof priority === 'number' ? priority : 0,
        level: subIndustryLevel,
        parentSubIndustryId,
        createdAt: now,
        updatedAt: now,
      }

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          Item: { PK: id, SK: 'METADATA', ...subIndustry },
        })
      )

      return successResponse(subIndustry, 201)
    }

    // Check parent industry exists
    const industryExists = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: industryId, SK: 'METADATA' },
      })
    )
    if (!industryExists.Item) return errorResponse('NOT_FOUND', '父行业不存在', 404)

    const id = generateId()
    const now = new Date().toISOString()

    const subIndustry: SubIndustry = {
      id,
      industryId,
      name: name.trim(),
      definition: definition.trim(),
      definitionCn: definitionCn?.trim() || undefined,
      typicalGlobalCompanies: Array.isArray(typicalGlobalCompanies) ? typicalGlobalCompanies : [],
      typicalChineseCompanies: Array.isArray(typicalChineseCompanies) ? typicalChineseCompanies : [],
      priority: typeof priority === 'number' ? priority : 0,
      level: subIndustryLevel,
      parentSubIndustryId: undefined,
      childrenIds: subIndustryLevel === 'Tier2-Group' ? [] : undefined,
      createdAt: now,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Item: { PK: id, SK: 'METADATA', ...subIndustry },
      })
    )

    if (subIndustry.typicalChineseCompanies?.length) {
      await processAndSaveCompanies(subIndustry.typicalChineseCompanies, 'chinese')
    }
    if (subIndustry.typicalGlobalCompanies?.length) {
      await processAndSaveCompanies(subIndustry.typicalGlobalCompanies, 'global')
    }

    return successResponse(subIndustry, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
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
    requireRole(user, ['admin', 'specialist'])

    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)

    const existingItem = await getSubIndustryById(subIndustryId)
    if (!existingItem) return errorResponse('NOT_FOUND', '子行业不存在', 404)

    const body = JSON.parse(event.body || '{}')
    const { name, definition, definitionCn, typicalGlobalCompanies, typicalChineseCompanies, priority } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '子行业名称不能为空', 400, { field: 'name', constraint: 'required' })
    }
    if (definition !== undefined && (typeof definition !== 'string' || definition.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '子行业定义不能为空', 400, { field: 'definition', constraint: 'required' })
    }

    const now = new Date().toISOString()
    const updated: SubIndustry = {
      id: subIndustryId,
      industryId: existingItem.industryId,
      name: name !== undefined ? name.trim() : existingItem.name,
      definition: definition !== undefined ? definition.trim() : existingItem.definition,
      definitionCn: definitionCn !== undefined ? (definitionCn?.trim() || undefined) : existingItem.definitionCn,
      typicalGlobalCompanies: typicalGlobalCompanies !== undefined ? typicalGlobalCompanies : (existingItem.typicalGlobalCompanies || []),
      typicalChineseCompanies: typicalChineseCompanies !== undefined ? typicalChineseCompanies : (existingItem.typicalChineseCompanies || []),
      priority: priority !== undefined ? priority : existingItem.priority,
      level: existingItem.level || 'Tier2-individual',
      parentSubIndustryId: existingItem.parentSubIndustryId,
      childrenIds: existingItem.childrenIds,
      createdAt: existingItem.createdAt,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Item: { PK: subIndustryId, SK: 'METADATA', ...updated },
      })
    )

    if (updated.typicalChineseCompanies?.length) {
      await processAndSaveCompanies(updated.typicalChineseCompanies, 'chinese')
    }
    if (updated.typicalGlobalCompanies?.length) {
      await processAndSaveCompanies(updated.typicalGlobalCompanies, 'global')
    }

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error updating sub-industry:', error)
    return errorResponse('INTERNAL_ERROR', '更新子行业失败', 500)
  }
}

/**
 * Delete a sub-industry
 * DELETE /admin/sub-industries/{id}
 */
export async function deleteSubIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)

    const subIndustryItem = await getSubIndustryById(subIndustryId)
    if (!subIndustryItem) return errorResponse('NOT_FOUND', '子行业不存在', 404)

    // Check for use cases using SubIndustryIndex GSI
    const useCases = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USE_CASES,
        IndexName: 'SubIndustryIndex',
        KeyConditionExpression: 'subIndustryId = :subIndustryId',
        ExpressionAttributeValues: { ':subIndustryId': subIndustryId },
        Limit: 1,
      })
    )

    if (useCases.Items && useCases.Items.length > 0) {
      return errorResponse('CONFLICT', '该子行业包含用例，无法删除。请先删除所有用例。', 409, { dependency: 'use-cases' })
    }

    // If Tier3, remove from parent's childrenIds
    if (subIndustryItem.level === 'Tier3' && subIndustryItem.parentSubIndustryId) {
      const parentItem = await getSubIndustryById(subIndustryItem.parentSubIndustryId)
      if (parentItem) {
        const updatedChildrenIds = (parentItem.childrenIds || []).filter((id: string) => id !== subIndustryId)
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAMES.SUB_INDUSTRIES,
            Item: {
              ...parentItem,
              childrenIds: updatedChildrenIds,
              updatedAt: new Date().toISOString(),
            },
          })
        )
      }
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Key: { PK: subIndustryId, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '子行业删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
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
    if (!subIndustryId) return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)

    const body = JSON.parse(event.body || '{}')
    const { newIndustryId } = body

    if (!newIndustryId || typeof newIndustryId !== 'string') {
      return errorResponse('VALIDATION_ERROR', '新行业ID不能为空', 400, { field: 'newIndustryId', constraint: 'required' })
    }

    const newIndustryExists = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: newIndustryId, SK: 'METADATA' },
      })
    )
    if (!newIndustryExists.Item) return errorResponse('NOT_FOUND', '目标行业不存在', 404)

    const existingItem = await getSubIndustryById(subIndustryId)
    if (!existingItem) return errorResponse('NOT_FOUND', '子行业不存在', 404)

    if (existingItem.industryId === newIndustryId) {
      return successResponse({ message: '子行业已在目标行业中', subIndustry: existingItem })
    }

    const now = new Date().toISOString()
    const movedItem = { ...existingItem, industryId: newIndustryId, updatedAt: now }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Item: { PK: subIndustryId, SK: 'METADATA', ...movedItem },
      })
    )

    return successResponse(movedItem)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error moving sub-industry:', error)
    return errorResponse('INTERNAL_ERROR', '移动子行业失败', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    if (method === 'GET' && (path === '/admin/sub-industries' || path === '/admin/sub-industries/')) {
      return await listSubIndustries(event)
    }
    if (method === 'GET' && path.match(/\/admin\/industries\/[^/]+\/sub-industries$/)) {
      return await listSubIndustries(event)
    }
    if (method === 'POST' && (path === '/admin/sub-industries' || path === '/admin/sub-industries/')) {
      return await createSubIndustry(event)
    }
    if (method === 'PUT' && path.match(/\/admin\/sub-industries\/[^/]+$/)) {
      return await updateSubIndustry(event)
    }
    if (method === 'DELETE' && path.match(/\/admin\/sub-industries\/[^/]+$/)) {
      return await deleteSubIndustry(event)
    }
    if (method === 'PATCH' && path.match(/\/admin\/sub-industries\/[^/]+\/move$/)) {
      return await moveSubIndustry(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
