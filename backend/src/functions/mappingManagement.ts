import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, DeleteCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { UseCaseSolutionMapping } from '../types'

/**
 * Get use case by id (PK=id, SK=METADATA)
 */
async function getUseCaseById(useCaseId: string): Promise<any | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.USE_CASES,
      Key: { PK: useCaseId, SK: 'METADATA' },
    })
  )
  return result.Item || null
}

/**
 * Check if user has access to a use case
 */
async function checkUseCaseAccess(user: any, useCaseId: string): Promise<boolean> {
  if (user.roles?.includes('admin') || user.role === 'admin') return true

  const useCase = await getUseCaseById(useCaseId)
  if (!useCase) return false

  const assignedIndustries = user.assignedIndustries || []
  return assignedIndustries.includes(useCase.industryId)
}

/**
 * Create a mapping between use case and solution
 * POST /specialist/use-cases/{useCaseId}/solutions/{solutionId}
 */
export async function createMapping(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.useCaseId
    const solutionId = event.pathParameters?.solutionId

    if (!useCaseId || !solutionId) {
      return errorResponse('VALIDATION_ERROR', '用例ID和解决方案ID不能为空', 400)
    }

    const hasAccess = await checkUseCaseAccess(user, useCaseId)
    if (!hasAccess) return errorResponse('FORBIDDEN', '您没有权限管理该用例的关联', 403)

    const useCaseExists = await getUseCaseById(useCaseId)
    if (!useCaseExists) return errorResponse('NOT_FOUND', '用例不存在', 404)

    const solutionResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: solutionId, SK: 'METADATA' },
      })
    )
    if (!solutionResult.Item) return errorResponse('NOT_FOUND', '解决方案不存在', 404)

    const existingMapping = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.MAPPING,
        Key: { PK: `USECASE#${useCaseId}`, SK: `SOLUTION#${solutionId}` },
      })
    )
    if (existingMapping.Item) return errorResponse('CONFLICT', '该关联已存在', 409)

    const now = new Date().toISOString()
    const mapping: UseCaseSolutionMapping = { useCaseId, solutionId, createdAt: now }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.MAPPING,
        Item: {
          PK: `USECASE#${useCaseId}`,
          SK: `SOLUTION#${solutionId}`,
          GSI_PK: `SOLUTION#${solutionId}`,
          GSI_SK: `USECASE#${useCaseId}`,
          ...mapping,
        },
      })
    )

    return successResponse(mapping, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error creating mapping:', error)
    return errorResponse('INTERNAL_ERROR', '创建关联失败', 500)
  }
}

/**
 * Delete a mapping
 * DELETE /specialist/use-cases/{useCaseId}/solutions/{solutionId}
 */
export async function deleteMapping(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.useCaseId
    const solutionId = event.pathParameters?.solutionId

    if (!useCaseId || !solutionId) {
      return errorResponse('VALIDATION_ERROR', '用例ID和解决方案ID不能为空', 400)
    }

    const hasAccess = await checkUseCaseAccess(user, useCaseId)
    if (!hasAccess) return errorResponse('FORBIDDEN', '您没有权限管理该用例的关联', 403)

    const existingMapping = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.MAPPING,
        Key: { PK: `USECASE#${useCaseId}`, SK: `SOLUTION#${solutionId}` },
      })
    )
    if (!existingMapping.Item) return errorResponse('NOT_FOUND', '关联不存在', 404)

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.MAPPING,
        Key: { PK: `USECASE#${useCaseId}`, SK: `SOLUTION#${solutionId}` },
      })
    )

    return successResponse({ message: '关联删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error deleting mapping:', error)
    return errorResponse('INTERNAL_ERROR', '删除关联失败', 500)
  }
}

/**
 * Get all solutions for a use case
 * GET /specialist/use-cases/{useCaseId}/solutions
 */
export async function getSolutionsForUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.useCaseId
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const hasAccess = await checkUseCaseAccess(user, useCaseId)
    if (!hasAccess) return errorResponse('FORBIDDEN', '您没有权限查看该用例的关联', 403)

    const mappings = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.MAPPING,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `USECASE#${useCaseId}` },
      })
    )

    const solutions = []
    for (const mapping of mappings.Items || []) {
      const solution = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.SOLUTIONS,
          Key: { PK: mapping.solutionId, SK: 'METADATA' },
        })
      )
      if (solution.Item) {
        solutions.push({
          id: solution.Item.id,
          name: solution.Item.name,
          description: solution.Item.description,
          detailMarkdownUrl: solution.Item.detailMarkdownUrl,
          createdAt: solution.Item.createdAt,
          mappedAt: mapping.createdAt,
        })
      }
    }

    return successResponse(solutions)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error getting solutions for use case:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案列表失败', 500)
  }
}

/**
 * Get all use cases for a solution
 * GET /specialist/solutions/{solutionId}/use-cases
 */
export async function getUseCasesForSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const solutionId = event.pathParameters?.solutionId
    if (!solutionId) return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)

    const mappings = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.MAPPING,
        IndexName: 'ReverseIndex',
        KeyConditionExpression: 'GSI_PK = :pk',
        ExpressionAttributeValues: { ':pk': `SOLUTION#${solutionId}` },
      })
    )

    const useCases = []
    for (const mapping of mappings.Items || []) {
      const useCase = await getUseCaseById(mapping.useCaseId)
      if (useCase) {
        if (user!.role === 'specialist') {
          const assignedIndustries = user!.assignedIndustries || []
          if (!assignedIndustries.includes(useCase.industryId)) continue
        }
        useCases.push({
          id: useCase.id,
          name: useCase.name,
          description: useCase.description,
          subIndustryId: useCase.subIndustryId,
          industryId: useCase.industryId,
          createdAt: useCase.createdAt,
          mappedAt: mapping.createdAt,
        })
      }
    }

    return successResponse(useCases)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error getting use cases for solution:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例列表失败', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    if (method === 'POST' && path.match(/\/specialist\/use-cases\/[^/]+\/solutions\/[^/]+$/)) {
      return await createMapping(event)
    }
    if (method === 'DELETE' && path.match(/\/specialist\/use-cases\/[^/]+\/solutions\/[^/]+$/)) {
      return await deleteMapping(event)
    }
    if (method === 'GET' && path.match(/\/specialist\/use-cases\/[^/]+\/solutions$/)) {
      return await getSolutionsForUseCase(event)
    }
    if (method === 'GET' && path.match(/\/specialist\/solutions\/[^/]+\/use-cases$/)) {
      return await getUseCasesForSolution(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
