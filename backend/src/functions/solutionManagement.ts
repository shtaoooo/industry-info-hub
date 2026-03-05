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
      createdBy: item.createdBy || '',
      industryIds: item.industryIds || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    // Specialist can only see solutions they created or belong to their assigned industries
    if (user!.role === 'specialist') {
      const userIndustries = user!.assignedIndustries || []
      return successResponse(
        solutions.filter(
          (s) =>
            s.createdBy === user!.userId ||
            s.industryIds.some((industryId) => userIndustries.includes(industryId))
        )
      )
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
      createdBy: result.Item.createdBy || '',
      industryIds: result.Item.industryIds || [],
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
    const { name, description, industryIds } = body

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
      createdBy: user!.userId,
      industryIds: Array.isArray(industryIds) ? industryIds : [],
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
    const { name, description, industryIds } = body

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
      createdBy: existing.Item.createdBy || '',
      industryIds: industryIds !== undefined ? (Array.isArray(industryIds) ? industryIds : []) : (existing.Item.industryIds || []),
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
 * Parse markdown content into structured fields
 */
function parseMarkdownFields(markdownContent: string): {
  targetCustomers?: string
  solutionContent?: string
  solutionSource?: string
  awsServices?: string
  whyAws?: string
  promotionKeyPoints?: string
  faq?: string
  keyTerms?: string
  successCases?: string
} {
  const fields: any = {}
  
  // Define section headers and their corresponding field names
  const sections = [
    { header: '## 适用客户群体', field: 'targetCustomers' },
    { header: '## 方案内容', field: 'solutionContent' },
    { header: '## 方案来源', field: 'solutionSource' },
    { header: '## 主要使用的AWS服务', field: 'awsServices' },
    { header: '## Why AWS', field: 'whyAws' },
    { header: '## 方案推广关键点', field: 'promotionKeyPoints' },
    { header: '## 客户常见问题解答', field: 'faq' },
    { header: '## 关键术语说明', field: 'keyTerms' },
    { header: '## 成功案例', field: 'successCases' },
  ]
  
  for (let i = 0; i < sections.length; i++) {
    const currentSection = sections[i]
    const headerIndex = markdownContent.indexOf(currentSection.header)
    
    if (headerIndex !== -1) {
      // Find the start of content (after the header and newlines)
      const contentStart = headerIndex + currentSection.header.length
      
      // Find the next section header or end of content
      let contentEnd = markdownContent.length
      for (let j = i + 1; j < sections.length; j++) {
        const nextHeaderIndex = markdownContent.indexOf(sections[j].header, contentStart)
        if (nextHeaderIndex !== -1) {
          contentEnd = nextHeaderIndex
          break
        }
      }
      
      // Extract and trim content
      const content = markdownContent.substring(contentStart, contentEnd).trim()
      if (content) {
        fields[currentSection.field] = content
      }
    }
  }
  
  return fields
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

    // Get markdown content from S3
    const s3Key = `solutions/${solutionId}/detail.md`
    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      })
    )

    // Read the content
    const markdownContent = await s3Response.Body?.transformToString('utf-8')
    if (!markdownContent) {
      return errorResponse('INTERNAL_ERROR', '无法读取Markdown文件内容', 500)
    }

    // Parse markdown into fields
    const fields = parseMarkdownFields(markdownContent)

    // Generate presigned URL for download
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }),
      { expiresIn: 3600 } // 1 hour
    )

    return successResponse({ 
      url: presignedUrl, 
      s3Url: existing.Item.detailMarkdownUrl,
      fields,
      markdownContent,
    })
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
