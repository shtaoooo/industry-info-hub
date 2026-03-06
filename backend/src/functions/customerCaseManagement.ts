import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { s3Client, BUCKET_NAME } from '../utils/s3'
import { Document } from '../types'
import { randomUUID } from 'crypto'

/**
 * List customer cases
 * GET /specialist/customer-cases
 * Uses CreatedAtIndex GSI to avoid Scan
 * Supports pagination via limit and lastEvaluatedKey query parameters
 */
async function listCustomerCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    // Parse pagination parameters
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 50
    const lastKey = event.queryStringParameters?.lastKey ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey)) : undefined

    // Use GSI to query all customer cases efficiently
    const queryParams: any = {
      TableName: TABLE_NAMES.CUSTOMER_CASES,
      IndexName: 'CreatedAtIndex',
      KeyConditionExpression: 'entityType = :type',
      ExpressionAttributeValues: { ':type': 'CUSTOMER_CASE' },
      ScanIndexForward: false, // Sort by createdAt descending
      Limit: Math.min(limit, 100), // Cap at 100
    }

    if (lastKey) {
      queryParams.ExclusiveStartKey = lastKey
    }

    const result = await docClient.send(new QueryCommand(queryParams))

    let items = result.Items || []

    // Specialist: filter by assigned industries via useCaseIds
    if (user!.role === 'specialist') {
      const assignedIndustries = user!.assignedIndustries || []

      // Build useCaseId -> industryId map using IndustryIndex GSI
      // Optimized: Query all assigned industries in parallel
      const useCaseIndustryMap: Record<string, string> = {}
      
      const queryPromises = assignedIndustries.map((industryId) =>
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.USE_CASES,
            IndexName: 'IndustryIndex',
            KeyConditionExpression: 'industryId = :industryId',
            ExpressionAttributeValues: { ':industryId': industryId },
            ProjectionExpression: 'id, industryId', // Only fetch needed fields
          })
        )
      )

      const results = await Promise.all(queryPromises)
      for (const result of results) {
        for (const uc of result.Items || []) {
          if (uc.id) useCaseIndustryMap[uc.id] = uc.industryId
        }
      }

      items = items.filter((item) => {
        const ucIds: string[] = item.useCaseIds || []
        if (ucIds.length === 0) return true
        return ucIds.some((ucId) => assignedIndustries.includes(useCaseIndustryMap[ucId]))
      })
    }

    const cases = items.map((item) => ({
      id: item.id,
      name: item.name,
      accountId: item.accountId || null,
      partner: item.partner || null,
      useCaseIds: item.useCaseIds || [],
      challenge: item.challenge || null,
      solution: item.solution || null,
      benefit: item.benefit || null,
      documents: item.documents || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
    }))

    return successResponse({
      items: cases,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
      count: cases.length,
    })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error listing customer cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取客户案例列表失败', 500)
  }
}

/**
 * Create a new customer case
 * POST /specialist/customer-cases
 */
async function createCustomerCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const body = JSON.parse(event.body || '{}')
    const { name, accountId, partner, useCaseIds, challenge, solution, benefit } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '客户案例名称不能为空', 400)
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    const caseItem = {
      PK: id,
      SK: 'METADATA',
      id,
      name: name.trim(),
      accountId: accountId || null,
      partner: partner || null,
      useCaseIds: Array.isArray(useCaseIds) ? useCaseIds : [],
      challenge: challenge || null,
      solution: solution || null,
      benefit: benefit || null,
      documents: [],
      createdAt: now,
      updatedAt: now,
      createdBy: user!.userId,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Item: caseItem,
      })
    )

    return successResponse(caseItem, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error creating customer case:', error)
    return errorResponse('INTERNAL_ERROR', '创建客户案例失败', 500)
  }
}

/**
 * Update an existing customer case
 * PUT /specialist/customer-cases/{id}
 */
async function updateCustomerCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCaseId = event.pathParameters?.id
    if (!customerCaseId) return errorResponse('VALIDATION_ERROR', '客户案例ID不能为空', 400)

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Key: { PK: customerCaseId, SK: 'METADATA' },
      })
    )

    if (!existing.Item) return errorResponse('NOT_FOUND', '客户案例不存在', 404)

    const body = JSON.parse(event.body || '{}')
    const { name, accountId, partner, useCaseIds, challenge, solution, benefit } = body

    const now = new Date().toISOString()
    const updatedItem = {
      ...existing.Item,
      name: name !== undefined ? name.trim() : existing.Item.name,
      accountId: accountId !== undefined ? accountId : existing.Item.accountId,
      partner: partner !== undefined ? partner : existing.Item.partner,
      useCaseIds: useCaseIds !== undefined ? (Array.isArray(useCaseIds) ? useCaseIds : []) : (existing.Item.useCaseIds || []),
      challenge: challenge !== undefined ? challenge : existing.Item.challenge,
      solution: solution !== undefined ? solution : existing.Item.solution,
      benefit: benefit !== undefined ? benefit : existing.Item.benefit,
      updatedAt: now,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Item: updatedItem,
      })
    )

    return successResponse(updatedItem)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error updating customer case:', error)
    return errorResponse('INTERNAL_ERROR', '更新客户案例失败', 500)
  }
}

/**
 * Delete a customer case
 * DELETE /specialist/customer-cases/{id}
 */
async function deleteCustomerCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCaseId = event.pathParameters?.id
    if (!customerCaseId) return errorResponse('VALIDATION_ERROR', '客户案例ID不能为空', 400)

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Key: { PK: customerCaseId, SK: 'METADATA' },
      })
    )

    if (!existing.Item) return errorResponse('NOT_FOUND', '客户案例不存在', 404)

    for (const doc of existing.Item.documents || []) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key }))
      } catch (s3Error) {
        console.error('Error deleting document from S3:', s3Error)
      }
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Key: { PK: customerCaseId, SK: 'METADATA' },
      })
    )

    return successResponse({ message: '客户案例删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') return errorResponse('FORBIDDEN', '权限不足', 403)
    console.error('Error deleting customer case:', error)
    return errorResponse('INTERNAL_ERROR', '删除客户案例失败', 500)
  }
}

/**
 * Upload document for a customer case
 * POST /specialist/customer-cases/{id}/documents
 */
async function uploadDocument(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCaseId = event.pathParameters?.id
    if (!customerCaseId) return errorResponse('VALIDATION_ERROR', '客户案例ID不能为空', 400)

    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Key: { PK: customerCaseId, SK: 'METADATA' },
      })
    )

    if (!existing.Item) return errorResponse('NOT_FOUND', '客户案例不存在', 404)

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

    const documentId = randomUUID()
    const s3Key = `customer-cases/${customerCaseId}/${documentId}-${fileName}`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        ServerSideEncryption: 'AES256',
      })
    )

    const document: Document = {
      id: documentId,
      name: fileName,
      s3Key,
      uploadedAt: new Date().toISOString(),
    }

    const documents = [...(existing.Item.documents || []), document]
    const updatedItem = {
      ...existing.Item,
      documents,
      updatedAt: new Date().toISOString(),
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Item: updatedItem,
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
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    if (method === 'GET' && (path === '/specialist/customer-cases' || path === '/specialist/customer-cases/')) {
      return await listCustomerCases(event)
    }
    if (method === 'POST' && (path === '/specialist/customer-cases' || path === '/specialist/customer-cases/')) {
      return await createCustomerCase(event)
    }
    if (method === 'PUT' && path.match(/\/specialist\/customer-cases\/[^/]+$/) && !path.includes('documents')) {
      return await updateCustomerCase(event)
    }
    if (method === 'DELETE' && path.match(/\/specialist\/customer-cases\/[^/]+$/) && !path.includes('documents')) {
      return await deleteCustomerCase(event)
    }
    if (method === 'POST' && path.match(/\/specialist\/customer-cases\/[^/]+\/documents$/)) {
      return await uploadDocument(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
