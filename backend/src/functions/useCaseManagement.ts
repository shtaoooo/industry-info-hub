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
 * Get use case by id directly (PK=id, SK=METADATA)
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
 * Check if user has access to the industry of a sub-industry
 */
async function checkSubIndustryAccess(user: any, subIndustryId: string): Promise<{ hasAccess: boolean; industryId?: string }> {
  if (user.roles?.includes('admin') || user.role === 'admin') {
    return { hasAccess: true }
  }

  const subIndustry = await getSubIndustryById(subIndustryId)
  if (!subIndustry) return { hasAccess: false }

  const industryId = subIndustry.industryId
  const hasAccess = hasIndustryAccess(user, industryId)
  return { hasAccess, industryId }
}

const mapUseCase = (item: any): UseCase => ({
  id: item.id,
  subIndustryId: item.subIndustryId,
  industryId: item.industryId,
  name: item.name,
  description: item.description,
  businessScenario: item.businessScenario,
  customerPainPoints: item.customerPainPoints,
  targetAudience: item.targetAudience,
  communicationScript: item.communicationScript,
  recommendationScore: item.recommendationScore || 3,
  documents: item.documents || [],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  createdBy: item.createdBy,
})

/**
 * List use cases
 * GET /specialist/use-cases
 * Uses SubIndustryIndex GSI or IndustryIndex GSI
 */
export async function listUseCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const useCases: UseCase[] = []

    if (user!.role === 'admin') {
      // Admin: scan all use cases
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAMES.USE_CASES,
          FilterExpression: 'SK = :sk',
          ExpressionAttributeValues: { ':sk': 'METADATA' },
        })
      )
      useCases.push(...(result.Items || []).map(mapUseCase))
    } else {
      // Specialist: query by assigned industries using IndustryIndex GSI
      const assignedIndustries = user!.assignedIndustries || []
      for (const industryId of assignedIndustries) {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.USE_CASES,
            IndexName: 'IndustryIndex',
            KeyConditionExpression: 'industryId = :industryId',
            ExpressionAttributeValues: { ':industryId': industryId },
          })
        )
        useCases.push(...(result.Items || []).map(mapUseCase))
      }
    }

    return successResponse(useCases)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error listing use cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例列表失败', 500)
  }
}

/**
 * Create a new use case
 * POST /specialist/use-cases
 * PK: id, SK: METADATA
 */
export async function createUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const body = JSON.parse(event.body || '{}')
    const { subIndustryId, name, description, businessScenario, customerPainPoints, targetAudience, communicationScript, recommendationScore } = body

    if (!subIndustryId || typeof subIndustryId !== 'string' || subIndustryId.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400, { field: 'subIndustryId', constraint: 'required' })
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '用例名称不能为空', 400, { field: 'name', constraint: 'required' })
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '用例描述不能为空', 400, { field: 'description', constraint: 'required' })
    }

    let validatedScore = 3
    if (recommendationScore !== undefined && recommendationScore !== null) {
      const score = Number(recommendationScore)
      if (isNaN(score) || score < 1 || score > 5 || !Number.isInteger(score)) {
        return errorResponse('VALIDATION_ERROR', '推荐指数必须是1-5之间的整数', 400, { field: 'recommendationScore', constraint: 'range' })
      }
      validatedScore = score
    }

    const accessCheck = await checkSubIndustryAccess(user, subIndustryId)
    if (!accessCheck.hasAccess) return errorResponse('FORBIDDEN', '您没有权限管理该子行业的用例', 403)

    const id = generateId()
    const now = new Date().toISOString()

    const useCase: UseCase = {
      id,
      subIndustryId,
      industryId: accessCheck.industryId || '',
      name: name.trim(),
      description: description.trim(),
      businessScenario: businessScenario?.trim() || undefined,
      customerPainPoints: customerPainPoints?.trim() || undefined,
      targetAudience: targetAudience?.trim() || undefined,
      communicationScript: communicationScript?.trim() || undefined,
      recommendationScore: validatedScore,
      documents: [],
      createdAt: now,
      updatedAt: now,
      createdBy: user!.userId,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: { PK: id, SK: 'METADATA', ...useCase },
      })
    )

    return successResponse(useCase, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
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
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const existingUseCase = await getUseCaseById(useCaseId)
    if (!existingUseCase) return errorResponse('NOT_FOUND', '用例不存在', 404)

    const accessCheck = await checkSubIndustryAccess(user, existingUseCase.subIndustryId)
    if (!accessCheck.hasAccess) return errorResponse('FORBIDDEN', '您没有权限修改该用例', 403)

    const body = JSON.parse(event.body || '{}')
    const { name, description, businessScenario, customerPainPoints, targetAudience, communicationScript, recommendationScore, subIndustryId: newSubIndustryId } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '用例名称不能为空', 400, { field: 'name', constraint: 'required' })
    }
    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '用例描述不能为空', 400, { field: 'description', constraint: 'required' })
    }

    let validatedScore = existingUseCase.recommendationScore || 3
    if (recommendationScore !== undefined && recommendationScore !== null) {
      const score = Number(recommendationScore)
      if (isNaN(score) || score < 1 || score > 5 || !Number.isInteger(score)) {
        return errorResponse('VALIDATION_ERROR', '推荐指数必须是1-5之间的整数', 400, { field: 'recommendationScore', constraint: 'range' })
      }
      validatedScore = score
    }

    let finalSubIndustryId = existingUseCase.subIndustryId
    let finalIndustryId = existingUseCase.industryId

    if (newSubIndustryId && newSubIndustryId !== existingUseCase.subIndustryId) {
      const newSubIndustry = await getSubIndustryById(newSubIndustryId)
      if (!newSubIndustry) return errorResponse('NOT_FOUND', '新的子行业不存在', 404)

      const newAccessCheck = await checkSubIndustryAccess(user, newSubIndustryId)
      if (!newAccessCheck.hasAccess) return errorResponse('FORBIDDEN', '您没有权限将用例移动到该子行业', 403)

      finalSubIndustryId = newSubIndustryId
      finalIndustryId = newSubIndustry.industryId
    }

    const now = new Date().toISOString()
    const updated: UseCase = {
      id: useCaseId,
      subIndustryId: finalSubIndustryId,
      industryId: finalIndustryId,
      name: name !== undefined ? name.trim() : existingUseCase.name,
      description: description !== undefined ? description.trim() : existingUseCase.description,
      businessScenario: businessScenario !== undefined ? (businessScenario?.trim() || undefined) : existingUseCase.businessScenario,
      customerPainPoints: customerPainPoints !== undefined ? (customerPainPoints?.trim() || undefined) : existingUseCase.customerPainPoints,
      targetAudience: targetAudience !== undefined ? (targetAudience?.trim() || undefined) : existingUseCase.targetAudience,
      communicationScript: communicationScript !== undefined ? (communicationScript?.trim() || undefined) : existingUseCase.communicationScript,
      recommendationScore: validatedScore,
      documents: existingUseCase.documents || [],
      createdAt: existingUseCase.createdAt,
      updatedAt: now,
      createdBy: existingUseCase.createdBy,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: { PK: useCaseId, SK: 'METADATA', ...updated },
      })
    )

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
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
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const existingUseCase = await getUseCaseById(useCaseId)
    if (!existingUseCase) return errorResponse('NOT_FOUND', '用例不存在', 404)

    const accessCheck = await checkSubIndustryAccess(user, existingUseCase.subIndustryId)
    if (!accessCheck.hasAccess) return errorResponse('FORBIDDEN', '您没有权限删除该用例', 403)

    // Delete documents from S3
    for (const doc of existingUseCase.documents || []) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key }))
      } catch (s3Error) {
        console.error('Error deleting document from S3:', s3Error)
      }
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Key: { PK: useCaseId, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '用例删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
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
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const existingUseCase = await getUseCaseById(useCaseId)
    if (!existingUseCase) return errorResponse('NOT_FOUND', '用例不存在', 404)

    const accessCheck = await checkSubIndustryAccess(user, existingUseCase.subIndustryId)
    if (!accessCheck.hasAccess) return errorResponse('FORBIDDEN', '您没有权限上传文档到该用例', 403)

    const body = JSON.parse(event.body || '{}')
    const { fileName, fileContent, contentType } = body

    if (!fileName || !fileContent) return errorResponse('VALIDATION_ERROR', '文件名和文件内容不能为空', 400)

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
    ]

    if (contentType && !allowedTypes.includes(contentType)) {
      return errorResponse('VALIDATION_ERROR', '不支持的文件类型', 400)
    }

    const buffer = Buffer.from(fileContent, 'base64')

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (buffer.length > maxSize) {
      return errorResponse('VALIDATION_ERROR', '文件大小不能超过10MB', 400)
    }

    // Validate file extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.csv']
    const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(fileExt)) {
      return errorResponse('VALIDATION_ERROR', '不支持的文件扩展名', 400)
    }

    const documentId = generateId()
    const s3Key = `use-cases/${useCaseId}/${documentId}-${fileName}`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        ServerSideEncryption: 'AES256',
      })
    )

    const document: Document = { id: documentId, name: fileName, s3Key, uploadedAt: new Date().toISOString() }
    const documents = [...(existingUseCase.documents || []), document]
    const updated = { ...existingUseCase, documents, updatedAt: new Date().toISOString() }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: { PK: useCaseId, SK: 'METADATA', ...updated },
      })
    )

    return successResponse({ document, message: '文档上传成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
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
    if (!useCaseId || !docId) return errorResponse('VALIDATION_ERROR', '用例ID和文档ID不能为空', 400)

    const existingUseCase = await getUseCaseById(useCaseId)
    if (!existingUseCase) return errorResponse('NOT_FOUND', '用例不存在', 404)

    const accessCheck = await checkSubIndustryAccess(user, existingUseCase.subIndustryId)
    if (!accessCheck.hasAccess) return errorResponse('FORBIDDEN', '您没有权限删除该用例的文档', 403)

    const documents = existingUseCase.documents || []
    const document = documents.find((d: Document) => d.id === docId)
    if (!document) return errorResponse('NOT_FOUND', '文档不存在', 404)

    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: document.s3Key }))
    } catch (s3Error) {
      console.error('Error deleting document from S3:', s3Error)
    }

    const updatedDocuments = documents.filter((d: Document) => d.id !== docId)
    const updated = { ...existingUseCase, documents: updatedDocuments, updatedAt: new Date().toISOString() }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Item: { PK: useCaseId, SK: 'METADATA', ...updated },
      })
    )

    return successResponse({ message: '文档删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error deleting document:', error)
    return errorResponse('INTERNAL_ERROR', '文档删除失败', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    if (method === 'GET' && (path === '/specialist/use-cases' || path === '/specialist/use-cases/')) {
      return await listUseCases(event)
    }
    if (method === 'POST' && (path === '/specialist/use-cases' || path === '/specialist/use-cases/')) {
      return await createUseCase(event)
    }
    if (method === 'PUT' && path.match(/\/specialist\/use-cases\/[^/]+\/?$/) && !path.includes('documents')) {
      return await updateUseCase(event)
    }
    if (method === 'DELETE' && path.match(/\/specialist\/use-cases\/[^/]+\/?$/) && !path.includes('documents')) {
      return await deleteUseCase(event)
    }
    if (method === 'POST' && path.match(/\/specialist\/use-cases\/[^/]+\/documents\/?$/)) {
      return await uploadDocument(event)
    }
    if (method === 'DELETE' && path.match(/\/specialist\/use-cases\/[^/]+\/documents\/[^/]+\/?$/)) {
      return await deleteDocument(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
