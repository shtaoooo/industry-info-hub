import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole, hasIndustryAccess } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { s3Client, BUCKET_NAME } from '../utils/s3'
import { Solution } from '../types'
import { randomUUID } from 'crypto'

function generateId(): string {
  return randomUUID()
}

/**
 * Get solution IDs that are mapped to use cases in the given industries
 */
async function getSolutionIdsForIndustries(assignedIndustries: string[]): Promise<Set<string>> {
  const solutionIds = new Set<string>()

  for (const industryId of assignedIndustries) {
    // Get sub-industries for this industry
    const subIndustries = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `INDUSTRY#${industryId}`,
        },
      })
    )

    for (const subIndustry of subIndustries.Items || []) {
      // Get use cases for this sub-industry
      const useCases = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.USE_CASES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `SUBINDUSTRY#${subIndustry.id}`,
          },
        })
      )

      for (const useCase of useCases.Items || []) {
        // Get mappings for this use case
        const mappings = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.MAPPING,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
              ':pk': `USECASE#${useCase.id}`,
            },
          })
        )

        for (const mapping of mappings.Items || []) {
          if (mapping.solutionId) {
            solutionIds.add(mapping.solutionId)
          }
        }
      }
    }
  }

  return solutionIds
}

/**
 * List all solutions
 * GET /admin/solutions
 */
export async function listSolutions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    const solutions: Solution[] = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      detailMarkdownUrl: item.detailMarkdownUrl,
      documents: item.documents || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    // Specialist can only see solutions mapped to use cases in their assigned industries
    if (user!.role === 'specialist') {
      const allowedSolutionIds = await getSolutionIdsForIndustries(user!.assignedIndustries || [])
      return successResponse(solutions.filter(s => allowedSolutionIds.has(s.id)))
    }

    return successResponse(solutions)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error listing solutions:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案列表失败', 500)
  }
}

/**
 * Get a single solution
 * GET /admin/solutions/{id}
 */
export async function getSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const solutionId = event.pathParameters?.id
    if (!solutionId) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: `SOLUTION#${solutionId}`, SK: 'METADATA' },
      })
    )

    if (!result.Item) {
      return errorResponse('NOT_FOUND', '解决方案不存在', 404)
    }

    const solution: Solution = {
      id: result.Item.id,
      name: result.Item.name,
      description: result.Item.description,
      detailMarkdownUrl: result.Item.detailMarkdownUrl,
      documents: result.Item.documents || [],
      createdAt: result.Item.createdAt,
      updatedAt: result.Item.updatedAt,
    }

    return successResponse(solution)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error getting solution:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案失败', 500)
  }
}

/**
 * Create a new solution
 * POST /admin/solutions
 */
export async function createSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const body = JSON.parse(event.body || '{}')
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '解决方案名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '解决方案描述不能为空', 400, {
        field: 'description',
        constraint: 'required',
      })
    }

    const id = generateId()
    const now = new Date().toISOString()

    const solution: Solution = {
      id,
      name: name.trim(),
      description: description.trim(),
      documents: [],
      createdAt: now,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Item: {
          PK: `SOLUTION#${id}`,
          SK: 'METADATA',
          ...solution,
        },
      })
    )

    return successResponse(solution, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error creating solution:', error)
    return errorResponse('INTERNAL_ERROR', '创建解决方案失败', 500)
  }
}

/**
 * Update an existing solution
 * PUT /admin/solutions/{id}
 */
export async function updateSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const solutionId = event.pathParameters?.id
    if (!solutionId) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)
    }

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: `SOLUTION#${solutionId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '解决方案不存在', 404)
    }

    const body = JSON.parse(event.body || '{}')
    const { name, description } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '解决方案名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '解决方案描述不能为空', 400, {
        field: 'description',
        constraint: 'required',
      })
    }

    const now = new Date().toISOString()
    const updated: Solution = {
      id: solutionId,
      name: name !== undefined ? name.trim() : existing.Item.name,
      description: description !== undefined ? description.trim() : existing.Item.description,
      detailMarkdownUrl: existing.Item.detailMarkdownUrl,
      documents: existing.Item.documents || [],
      createdAt: existing.Item.createdAt,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Item: {
          PK: `SOLUTION#${solutionId}`,
          SK: 'METADATA',
          ...updated,
        },
      })
    )

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error updating solution:', error)
    return errorResponse('INTERNAL_ERROR', '更新解决方案失败', 500)
  }
}

/**
 * Delete a solution (with referential integrity check)
 * DELETE /admin/solutions/{id}
 */
export async function deleteSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const solutionId = event.pathParameters?.id
    if (!solutionId) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)
    }

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: `SOLUTION#${solutionId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '解决方案不存在', 404)
    }

    // Check for customer cases referencing this solution
    const customerCases = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `SOLUTION#${solutionId}`,
        },
        Limit: 1,
      })
    )

    if (customerCases.Items && customerCases.Items.length > 0) {
      return errorResponse('CONFLICT', '该解决方案被客户案例引用，无法删除。请先删除相关客户案例。', 409, {
        dependency: 'customer-cases',
      })
    }

    // Delete markdown file from S3 if exists
    if (existing.Item.detailMarkdownUrl) {
      const s3Key = `solutions/${solutionId}/detail.md`
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
          })
        )
      } catch (s3Error) {
        console.error('Error deleting markdown from S3:', s3Error)
        // Continue with deletion even if S3 delete fails
      }
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: `SOLUTION#${solutionId}`, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '解决方案删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error deleting solution:', error)
    return errorResponse('INTERNAL_ERROR', '删除解决方案失败', 500)
  }
}

/**
 * Upload markdown detail file for a solution
 * POST /admin/solutions/{id}/detail-markdown
 */
export async function uploadMarkdown(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const solutionId = event.pathParameters?.id
    if (!solutionId) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)
    }

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: `SOLUTION#${solutionId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '解决方案不存在', 404)
    }

    const body = JSON.parse(event.body || '{}')
    const { markdownContent } = body

    if (!markdownContent || typeof markdownContent !== 'string') {
      return errorResponse('VALIDATION_ERROR', 'Markdown内容不能为空', 400)
    }

    // Upload to S3
    const s3Key = `solutions/${solutionId}/detail.md`
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: markdownContent,
        ContentType: 'text/markdown',
      })
    )

    // Generate URL
    const detailMarkdownUrl = `s3://${BUCKET_NAME}/${s3Key}`

    // Update solution with markdown URL
    const now = new Date().toISOString()
    const updated: Solution = {
      ...existing.Item,
      detailMarkdownUrl,
      updatedAt: now,
    } as Solution

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Item: {
          PK: `SOLUTION#${solutionId}`,
          SK: 'METADATA',
          ...updated,
        },
      })
    )

    return successResponse({ detailMarkdownUrl, message: 'Markdown文件上传成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error uploading markdown:', error)
    return errorResponse('INTERNAL_ERROR', 'Markdown文件上传失败', 500)
  }
}

/**
 * Get markdown detail file URL for a solution
 * GET /admin/solutions/{id}/detail-markdown
 */
export async function getMarkdownUrl(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const solutionId = event.pathParameters?.id
    if (!solutionId) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)
    }

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: `SOLUTION#${solutionId}`, SK: 'METADATA' },
      })
    )

    if (!existing.Item) {
      return errorResponse('NOT_FOUND', '解决方案不存在', 404)
    }

    if (!existing.Item.detailMarkdownUrl) {
      return errorResponse('NOT_FOUND', '该解决方案没有详细介绍文件', 404)
    }

    // Generate presigned URL for download
    const s3Key = `solutions/${solutionId}/detail.md`
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }),
      { expiresIn: 3600 } // 1 hour
    )

    return successResponse({ url: presignedUrl, s3Url: existing.Item.detailMarkdownUrl })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error getting markdown URL:', error)
    return errorResponse('INTERNAL_ERROR', '获取Markdown文件URL失败', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // GET /admin/solutions
    if (method === 'GET' && (path === '/admin/solutions' || path === '/admin/solutions/')) {
      return await listSolutions(event)
    }

    // GET /admin/solutions/{id}
    if (method === 'GET' && path.match(/\/admin\/solutions\/[^/]+$/) && !path.includes('detail-markdown')) {
      return await getSolution(event)
    }

    // POST /admin/solutions
    if (method === 'POST' && (path === '/admin/solutions' || path === '/admin/solutions/')) {
      return await createSolution(event)
    }

    // PUT /admin/solutions/{id}
    if (method === 'PUT' && path.match(/\/admin\/solutions\/[^/]+$/)) {
      return await updateSolution(event)
    }

    // DELETE /admin/solutions/{id}
    if (method === 'DELETE' && path.match(/\/admin\/solutions\/[^/]+$/)) {
      return await deleteSolution(event)
    }

    // POST /admin/solutions/{id}/detail-markdown
    if (method === 'POST' && path.match(/\/admin\/solutions\/[^/]+\/detail-markdown$/)) {
      return await uploadMarkdown(event)
    }

    // GET /admin/solutions/{id}/detail-markdown
    if (method === 'GET' && path.match(/\/admin\/solutions\/[^/]+\/detail-markdown$/)) {
      return await getMarkdownUrl(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
