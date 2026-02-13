import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole, hasIndustryAccess } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { s3Client, BUCKET_NAME } from '../utils/s3'
import { UseCase, Document } from '../types'
import { randomUUID } from 'crypto'

function generateId(): string {
  return randomUUID()
}

/**
 * Check if user has access to the industry of a sub-industry
 */
async function checkSubIndustryAccess(user: any, subIndustryId: string): Promise<{ hasAccess: boolean; industryId?: string }> {
  // Admin has access to everything
  if (user.role === 'admin') {
    return { hasAccess: true }
  }

  // Find the sub-industry to get its industry
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
      const industryId = industry.id
      const hasAccess = hasIndustryAccess(user, industryId)
      return { hasAccess, industryId }
    }
  }

  return { hasAccess: false }
}

/**
 * List use cases (filtered by specialist's assigned industries)
 * GET /specialist/use-cases
 */
export async function listUseCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCases: UseCase[] = []

    if (user!.role === 'admin') {
      // Admin can see all use cases
      // Scan all sub-industries
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
        const subIndustries = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.SUB_INDUSTRIES,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
              ':pk': `INDUSTRY#${industry.id}`,
            },
          })
        )

        for (const subIndustry of subIndustries.Items || []) {
          const result = await docClient.send(
            new QueryCommand({
              TableName: TABLE_NAMES.USE_CASES,
              KeyConditionExpression: 'PK = :pk',
              ExpressionAttributeValues: {
                ':pk': `SUBINDUSTRY#${subIndustry.id}`,
              },
            })
          )

          useCases.push(
            ...(result.Items || []).map((item) => ({
              id: item.id,
              subIndustryId: item.subIndustryId,
              industryId: item.industryId,
              name: item.name,
              description: item.description,
              documents: item.documents || [],
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              createdBy: item.createdBy,
            }))
          )
        }
      }
    } else {
      // Specialist can only see use cases in their assigned industries
      const assignedIndustries = user!.assignedIndustries || []

      for (const industryId of assignedIndustries) {
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
          const result = await docClient.send(
            new QueryCommand({
              TableName: TABLE_NAMES.USE_CASES,
              KeyConditionExpression: 'PK = :pk',
              ExpressionAttributeValues: {
                ':pk': `SUBINDUSTRY#${subIndustry.id}`,
              },
            })
          )

          useCases.push(
            ...(result.Items || []).map((item) => ({
              id: item.id,
              subIndustryId: item.subIndustryId,
              industryId: item.industryId,
              name: item.name,
              description: item.description,
              documents: item.documents || [],
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              createdBy: item.createdBy,
            }))
          )
        }
      }
    }

    return successResponse(useCases)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error listing use cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例列表失败', 500)
  }
}

/**
 * Create a new use case
 * POST /specialist/use-cases
 */
export async function createUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const body = JSON.parse(event.body || '{}')
    const { subIndustryId, name, description } = body

    if (!subIndustryId || typeof subIndustryId !== 'string' || subIndustryId.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400, { field: 'subIndustryId', constraint: 'required' })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '用例名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '用例描述不能为空', 400, { field: 'description', constraint: 'required' })
    }

    // Check if user has access to this sub-industry's industry
    const accessCheck = await checkSubIndustryAccess(user, subIndustryId)
    if (!accessCheck.hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限管理该子行业的用例', 403)
    }

    const id = generateId()
    const now = new Date().toISOString()

    const useCase: UseCase = {
      id,
      subIndustryId,
      industryId: accessCheck.industryId || '',
      name: name.trim(),
      description: description.trim(),
      documents: [],
      createdAt: now,
      updatedAt: now,
      createdBy: user!.userId,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: {
          PK: `SUBINDUSTRY#${subIndustryId}`,
          SK: `USECASE#${id}`,
          ...useCase,
        },
      })
    )

    return successResponse(useCase, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error creating use case:', error)
    return errorResponse('INTERNAL_ERROR', '创建用例失败', 500)
  }
}

/**
 * Update an existing use case
 * PUT /specialist/use-cases/{id}
 */
export async function updateUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.id
    if (!useCaseId) {
      return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)
    }

    // Find the use case
    let existingUseCase: any = null
    let existingSubIndustryId: string = ''

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
      const subIndustries = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `INDUSTRY#${industry.id}`,
          },
        })
      )

      for (const subIndustry of subIndustries.Items || []) {
        const result = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.USE_CASES,
            Key: {
              PK: `SUBINDUSTRY#${subIndustry.id}`,
              SK: `USECASE#${useCaseId}`,
            },
          })
        )

        if (result.Item) {
          existingUseCase = result.Item
          existingSubIndustryId = subIndustry.id
          break
        }
      }

      if (existingUseCase) break
    }

    if (!existingUseCase) {
      return errorResponse('NOT_FOUND', '用例不存在', 404)
    }

    // Check if user has access
    const accessCheck = await checkSubIndustryAccess(user, existingSubIndustryId)
    if (!accessCheck.hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限修改该用例', 403)
    }

    const body = JSON.parse(event.body || '{}')
    const { name, description } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '用例名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '用例描述不能为空', 400, { field: 'description', constraint: 'required' })
    }

    const now = new Date().toISOString()
    const updated: UseCase = {
      id: useCaseId,
      subIndustryId: existingSubIndustryId,
      industryId: existingUseCase.industryId,
      name: name !== undefined ? name.trim() : existingUseCase.name,
      description: description !== undefined ? description.trim() : existingUseCase.description,
      documents: existingUseCase.documents || [],
      createdAt: existingUseCase.createdAt,
      updatedAt: now,
      createdBy: existingUseCase.createdBy,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: {
          PK: `SUBINDUSTRY#${existingSubIndustryId}`,
          SK: `USECASE#${useCaseId}`,
          ...updated,
        },
      })
    )

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error updating use case:', error)
    return errorResponse('INTERNAL_ERROR', '更新用例失败', 500)
  }
}

/**
 * Delete a use case
 * DELETE /specialist/use-cases/{id}
 */
export async function deleteUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.id
    if (!useCaseId) {
      return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)
    }

    // Find the use case
    let existingUseCase: any = null
    let existingSubIndustryId: string = ''

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
      const subIndustries = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `INDUSTRY#${industry.id}`,
          },
        })
      )

      for (const subIndustry of subIndustries.Items || []) {
        const result = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.USE_CASES,
            Key: {
              PK: `SUBINDUSTRY#${subIndustry.id}`,
              SK: `USECASE#${useCaseId}`,
            },
          })
        )

        if (result.Item) {
          existingUseCase = result.Item
          existingSubIndustryId = subIndustry.id
          break
        }
      }

      if (existingUseCase) break
    }

    if (!existingUseCase) {
      return errorResponse('NOT_FOUND', '用例不存在', 404)
    }

    // Check if user has access
    const accessCheck = await checkSubIndustryAccess(user, existingSubIndustryId)
    if (!accessCheck.hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限删除该用例', 403)
    }

    // Check for references (solutions, customer cases)
    // TODO: Add checks for solution mappings and customer cases

    // Delete documents from S3
    const documents = existingUseCase.documents || []
    for (const doc of documents) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: doc.s3Key,
          })
        )
      } catch (s3Error) {
        console.error('Error deleting document from S3:', s3Error)
      }
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Key: {
          PK: `SUBINDUSTRY#${existingSubIndustryId}`,
          SK: `USECASE#${useCaseId}`,
        },
      })
    )

    return successResponse({ message: '用例删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error deleting use case:', error)
    return errorResponse('INTERNAL_ERROR', '删除用例失败', 500)
  }
}

/**
 * Upload document for a use case
 * POST /specialist/use-cases/{id}/documents
 */
export async function uploadDocument(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.id
    if (!useCaseId) {
      return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)
    }

    // Find the use case
    let existingUseCase: any = null
    let existingSubIndustryId: string = ''

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
      const subIndustries = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `INDUSTRY#${industry.id}`,
          },
        })
      )

      for (const subIndustry of subIndustries.Items || []) {
        const result = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.USE_CASES,
            Key: {
              PK: `SUBINDUSTRY#${subIndustry.id}`,
              SK: `USECASE#${useCaseId}`,
            },
          })
        )

        if (result.Item) {
          existingUseCase = result.Item
          existingSubIndustryId = subIndustry.id
          break
        }
      }

      if (existingUseCase) break
    }

    if (!existingUseCase) {
      return errorResponse('NOT_FOUND', '用例不存在', 404)
    }

    // Check if user has access
    const accessCheck = await checkSubIndustryAccess(user, existingSubIndustryId)
    if (!accessCheck.hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限上传文档到该用例', 403)
    }

    const body = JSON.parse(event.body || '{}')
    const { fileName, fileContent, contentType } = body

    if (!fileName || !fileContent) {
      return errorResponse('VALIDATION_ERROR', '文件名和文件内容不能为空', 400)
    }

    // Upload to S3
    const documentId = generateId()
    const s3Key = `use-cases/${useCaseId}/${documentId}-${fileName}`

    // Decode base64 content
    const buffer = Buffer.from(fileContent, 'base64')

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      })
    )

    // Add document to use case
    const document: Document = {
      id: documentId,
      name: fileName,
      s3Key,
      uploadedAt: new Date().toISOString(),
    }

    const documents = [...(existingUseCase.documents || []), document]
    const updated: UseCase = {
      ...existingUseCase,
      documents,
      updatedAt: new Date().toISOString(),
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: {
          PK: `SUBINDUSTRY#${existingSubIndustryId}`,
          SK: `USECASE#${useCaseId}`,
          ...updated,
        },
      })
    )

    return successResponse({ document, message: '文档上传成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error uploading document:', error)
    return errorResponse('INTERNAL_ERROR', '文档上传失败', 500)
  }
}

/**
 * Delete document from a use case
 * DELETE /specialist/use-cases/{id}/documents/{docId}
 */
export async function deleteDocument(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCaseId = event.pathParameters?.id
    const docId = event.pathParameters?.docId

    if (!useCaseId || !docId) {
      return errorResponse('VALIDATION_ERROR', '用例ID和文档ID不能为空', 400)
    }

    // Find the use case
    let existingUseCase: any = null
    let existingSubIndustryId: string = ''

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
      const subIndustries = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.SUB_INDUSTRIES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `INDUSTRY#${industry.id}`,
          },
        })
      )

      for (const subIndustry of subIndustries.Items || []) {
        const result = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.USE_CASES,
            Key: {
              PK: `SUBINDUSTRY#${subIndustry.id}`,
              SK: `USECASE#${useCaseId}`,
            },
          })
        )

        if (result.Item) {
          existingUseCase = result.Item
          existingSubIndustryId = subIndustry.id
          break
        }
      }

      if (existingUseCase) break
    }

    if (!existingUseCase) {
      return errorResponse('NOT_FOUND', '用例不存在', 404)
    }

    // Check if user has access
    const accessCheck = await checkSubIndustryAccess(user, existingSubIndustryId)
    if (!accessCheck.hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限删除该用例的文档', 403)
    }

    // Find and delete document
    const documents = existingUseCase.documents || []
    const document = documents.find((d: Document) => d.id === docId)

    if (!document) {
      return errorResponse('NOT_FOUND', '文档不存在', 404)
    }

    // Delete from S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: document.s3Key,
        })
      )
    } catch (s3Error) {
      console.error('Error deleting document from S3:', s3Error)
    }

    // Remove document from use case
    const updatedDocuments = documents.filter((d: Document) => d.id !== docId)
    const updated: UseCase = {
      ...existingUseCase,
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: {
          PK: `SUBINDUSTRY#${existingSubIndustryId}`,
          SK: `USECASE#${useCaseId}`,
          ...updated,
        },
      })
    )

    return successResponse({ message: '文档删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error deleting document:', error)
    return errorResponse('INTERNAL_ERROR', '文档删除失败', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // GET /specialist/use-cases
    if (method === 'GET' && (path === '/specialist/use-cases' || path === '/specialist/use-cases/')) {
      return await listUseCases(event)
    }

    // POST /specialist/use-cases
    if (method === 'POST' && (path === '/specialist/use-cases' || path === '/specialist/use-cases/')) {
      return await createUseCase(event)
    }

    // PUT /specialist/use-cases/{id}
    if (method === 'PUT' && path.match(/\/specialist\/use-cases\/[^/]+$/) && !path.includes('documents')) {
      return await updateUseCase(event)
    }

    // DELETE /specialist/use-cases/{id}
    if (method === 'DELETE' && path.match(/\/specialist\/use-cases\/[^/]+$/) && !path.includes('documents')) {
      return await deleteUseCase(event)
    }

    // POST /specialist/use-cases/{id}/documents
    if (method === 'POST' && path.match(/\/specialist\/use-cases\/[^/]+\/documents$/)) {
      return await uploadDocument(event)
    }

    // DELETE /specialist/use-cases/{id}/documents/{docId}
    if (method === 'DELETE' && path.match(/\/specialist\/use-cases\/[^/]+\/documents\/[^/]+$/)) {
      return await deleteDocument(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
