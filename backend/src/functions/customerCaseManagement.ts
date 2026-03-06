import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole, hasRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { s3Client, BUCKET_NAME } from '../utils/s3'
import { Document } from '../types'
import { randomUUID } from 'crypto'

/**
 * List customer cases
 * GET /specialist/customer-cases
 * - admin: Scan all cases
 * - specialist: Query IndustryIndex GSI for each assigned industry
 */
async function listCustomerCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    let items: any[] = []

    if (hasRole(user, 'admin')) {
      // Admin: scan all customer cases
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAMES.CUSTOMER_CASES,
          FilterExpression: 'SK = :sk',
          ExpressionAttributeValues: { ':sk': 'METADATA' },
        })
      )
      items = result.Items || []
    } else {
      // Specialist: query by each assigned industry in parallel
      const assignedIndustries = user!.assignedIndustries || []
      if (assignedIndustries.length === 0) {
        return successResponse([])
      }

      const queryPromises = assignedIndustries.map((industryId) =>
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.CUSTOMER_CASES,
            IndexName: 'IndustryIndex',
            KeyConditionExpression: 'industryId = :industryId',
            ExpressionAttributeValues: { ':industryId': industryId },
            ScanIndexForward: false,
          })
        )
      )

      const results = await Promise.all(queryPromises)
      const seen = new Set<string>()
      for (const result of results) {
        for (const item of result.Items || []) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            items.push(item)
          }
        }
      }
      // Sort by createdAt descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    const cases = items.map((item) => ({
      id: item.id,
      name: item.name,
      industryId: item.industryId || null,
      accountId: item.accountId || null,
      partner: item.partner || null,
      useCaseIds: item.useCaseIds || [],
      summary: item.summary || null,
      detailMarkdownS3Key: item.detailMarkdownS3Key || null,
      documents: item.documents || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
    }))

    return successResponse(cases)
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
    const { name, accountId, partner, useCaseIds, industryId, summary, detailMarkdown } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '客户案例名称不能为空', 400)
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    // Upload detail markdown to S3 if provided
    let detailMarkdownS3Key: string | null = null
    if (detailMarkdown && typeof detailMarkdown === 'string' && detailMarkdown.trim().length > 0) {
      detailMarkdownS3Key = `docs/customerCase/${id}.md`
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: detailMarkdownS3Key,
          Body: Buffer.from(detailMarkdown, 'utf-8'),
          ContentType: 'text/markdown',
          ServerSideEncryption: 'AES256',
        })
      )
    }

    const caseItem = {
      PK: id,
      SK: 'METADATA',
      id,
      industryId: industryId || null,
      name: name.trim(),
      accountId: accountId || null,
      partner: partner || null,
      useCaseIds: Array.isArray(useCaseIds) ? useCaseIds : [],
      summary: summary || null,
      detailMarkdownS3Key,
      documents: [],
      createdAt: now,
      updatedAt: now,
      createdBy: user!.userId,
    }

    await docClient.send(new PutCommand({ TableName: TABLE_NAMES.CUSTOMER_CASES, Item: caseItem }))
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
      new GetCommand({ TableName: TABLE_NAMES.CUSTOMER_CASES, Key: { PK: customerCaseId, SK: 'METADATA' } })
    )
    if (!existing.Item) return errorResponse('NOT_FOUND', '客户案例不存在', 404)

    const body = JSON.parse(event.body || '{}')
    const { name, accountId, partner, useCaseIds, industryId, summary, detailMarkdown } = body

    // Upload detail markdown to S3 if provided
    let detailMarkdownS3Key = existing.Item.detailMarkdownS3Key || null
    if (detailMarkdown !== undefined) {
      if (detailMarkdown && detailMarkdown.trim().length > 0) {
        detailMarkdownS3Key = `docs/customerCase/${customerCaseId}.md`
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: detailMarkdownS3Key,
            Body: Buffer.from(detailMarkdown, 'utf-8'),
            ContentType: 'text/markdown',
            ServerSideEncryption: 'AES256',
          })
        )
      }
    }

    const now = new Date().toISOString()
    const updatedItem = {
      ...existing.Item,
      name: name !== undefined ? name.trim() : existing.Item.name,
      industryId: industryId !== undefined ? industryId : existing.Item.industryId,
      accountId: accountId !== undefined ? accountId : existing.Item.accountId,
      partner: partner !== undefined ? partner : existing.Item.partner,
      useCaseIds: useCaseIds !== undefined ? (Array.isArray(useCaseIds) ? useCaseIds : []) : (existing.Item.useCaseIds || []),
      summary: summary !== undefined ? summary : existing.Item.summary,
      detailMarkdownS3Key,
      updatedAt: now,
    }

    await docClient.send(new PutCommand({ TableName: TABLE_NAMES.CUSTOMER_CASES, Item: updatedItem }))
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

    // Delete all documents from S3
    for (const doc of existing.Item.documents || []) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key }))
      } catch (s3Error) {
        console.error('Error deleting document from S3:', s3Error)
      }
    }

    // Delete detail markdown file from S3 if exists
    if (existing.Item.detailMarkdownS3Key) {
      try {
        await s3Client.send(new DeleteObjectCommand({ 
          Bucket: BUCKET_NAME, 
          Key: existing.Item.detailMarkdownS3Key 
        }))
      } catch (s3Error) {
        console.error('Error deleting markdown from S3:', s3Error)
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
