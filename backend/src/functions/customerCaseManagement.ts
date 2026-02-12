import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { s3Client, BUCKET_NAME } from '../utils/s3'
import { CustomerCase, Document } from '../types'

function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Check if user has access to a use case
 */
async function checkUseCaseAccess(user: any, useCaseId: string): Promise<boolean> {
  if (user.role === 'admin') {
    return true
  }

  const industries = await docClient.send(
    new QueryCommand({
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
        const assignedIndustries = user.assignedIndustries || []
        return assignedIndustries.includes(industry.id)
      }
    }
  }

  return false
}

/**
 * List customer cases (filtered by specialist's assigned industries)
 * GET /specialist/customer-cases
 */
export async function listCustomerCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCases: CustomerCase[] = []

    // Get all solutions
    const solutions = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const solution of solutions.Items || []) {
      const cases = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.CUSTOMER_CASES,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `SOLUTION#${solution.id}`,
          },
        })
      )

      for (const caseItem of cases.Items || []) {
        // Check if user has access to this case's use case
        if (user!.role === 'specialist') {
          const hasAccess = await checkUseCaseAccess(user, caseItem.useCaseId)
          if (!hasAccess) {
            continue
          }
        }

        customerCases.push({
          id: caseItem.id,
          solutionId: caseItem.solutionId,
          useCaseId: caseItem.useCaseId,
          name: caseItem.name,
          description: caseItem.description,
          documents: caseItem.documents || [],
          createdAt: caseItem.createdAt,
          updatedAt: caseItem.updatedAt,
          createdBy: caseItem.createdBy,
        })
      }
    }

    return successResponse(customerCases)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error listing customer cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取客户案例列表失败', 500)
  }
}

/**
 * Create a new customer case
 * POST /specialist/customer-cases
 */
export async function createCustomerCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const body = JSON.parse(event.body || '{}')
    const { solutionId, useCaseId, name, description } = body

    if (!solutionId || typeof solutionId !== 'string' || solutionId.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400, { field: 'solutionId', constraint: 'required' })
    }

    if (!useCaseId || typeof useCaseId !== 'string' || useCaseId.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400, { field: 'useCaseId', constraint: 'required' })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '客户案例名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', '客户案例描述不能为空', 400, {
        field: 'description',
        constraint: 'required',
      })
    }

    // Check if user has access to this use case
    const hasAccess = await checkUseCaseAccess(user, useCaseId)
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限管理该用例的客户案例', 403)
    }

    // Verify that the solution and use case are mapped
    const mapping = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.MAPPING,
        Key: {
          PK: `USECASE#${useCaseId}`,
          SK: `SOLUTION#${solutionId}`,
        },
      })
    )

    if (!mapping.Item) {
      return errorResponse('VALIDATION_ERROR', '指定的解决方案和用例之间不存在关联关系', 400)
    }

    const id = generateId()
    const now = new Date().toISOString()

    const customerCase: CustomerCase = {
      id,
      solutionId,
      useCaseId,
      name: name.trim(),
      description: description.trim(),
      documents: [],
      createdAt: now,
      updatedAt: now,
      createdBy: user!.userId,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Item: {
          PK: `SOLUTION#${solutionId}`,
          SK: `CUSTOMERCASE#${id}`,
          ...customerCase,
        },
      })
    )

    return successResponse(customerCase, 201)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error creating customer case:', error)
    return errorResponse('INTERNAL_ERROR', '创建客户案例失败', 500)
  }
}

/**
 * Update an existing customer case
 * PUT /specialist/customer-cases/{id}
 */
export async function updateCustomerCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCaseId = event.pathParameters?.id
    if (!customerCaseId) {
      return errorResponse('VALIDATION_ERROR', '客户案例ID不能为空', 400)
    }

    // Find the customer case
    let existingCase: any = null
    let existingSolutionId: string = ''

    const solutions = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const solution of solutions.Items || []) {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.CUSTOMER_CASES,
          Key: {
            PK: `SOLUTION#${solution.id}`,
            SK: `CUSTOMERCASE#${customerCaseId}`,
          },
        })
      )

      if (result.Item) {
        existingCase = result.Item
        existingSolutionId = solution.id
        break
      }
    }

    if (!existingCase) {
      return errorResponse('NOT_FOUND', '客户案例不存在', 404)
    }

    // Check if user has access
    const hasAccess = await checkUseCaseAccess(user, existingCase.useCaseId)
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限修改该客户案例', 403)
    }

    const body = JSON.parse(event.body || '{}')
    const { name, description } = body

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '客户案例名称不能为空', 400, { field: 'name', constraint: 'required' })
    }

    if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
      return errorResponse('VALIDATION_ERROR', '客户案例描述不能为空', 400, {
        field: 'description',
        constraint: 'required',
      })
    }

    const now = new Date().toISOString()
    const updated: CustomerCase = {
      id: customerCaseId,
      solutionId: existingSolutionId,
      useCaseId: existingCase.useCaseId,
      name: name !== undefined ? name.trim() : existingCase.name,
      description: description !== undefined ? description.trim() : existingCase.description,
      documents: existingCase.documents || [],
      createdAt: existingCase.createdAt,
      updatedAt: now,
      createdBy: existingCase.createdBy,
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Item: {
          PK: `SOLUTION#${existingSolutionId}`,
          SK: `CUSTOMERCASE#${customerCaseId}`,
          ...updated,
        },
      })
    )

    return successResponse(updated)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error updating customer case:', error)
    return errorResponse('INTERNAL_ERROR', '更新客户案例失败', 500)
  }
}

/**
 * Delete a customer case
 * DELETE /specialist/customer-cases/{id}
 */
export async function deleteCustomerCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCaseId = event.pathParameters?.id
    if (!customerCaseId) {
      return errorResponse('VALIDATION_ERROR', '客户案例ID不能为空', 400)
    }

    // Find the customer case
    let existingCase: any = null
    let existingSolutionId: string = ''

    const solutions = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const solution of solutions.Items || []) {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.CUSTOMER_CASES,
          Key: {
            PK: `SOLUTION#${solution.id}`,
            SK: `CUSTOMERCASE#${customerCaseId}`,
          },
        })
      )

      if (result.Item) {
        existingCase = result.Item
        existingSolutionId = solution.id
        break
      }
    }

    if (!existingCase) {
      return errorResponse('NOT_FOUND', '客户案例不存在', 404)
    }

    // Check if user has access
    const hasAccess = await checkUseCaseAccess(user, existingCase.useCaseId)
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限删除该客户案例', 403)
    }

    // Delete documents from S3
    const documents = existingCase.documents || []
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
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Key: {
          PK: `SOLUTION#${existingSolutionId}`,
          SK: `CUSTOMERCASE#${customerCaseId}`,
        },
      })
    )

    return successResponse({ message: '客户案例删除成功' })
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error deleting customer case:', error)
    return errorResponse('INTERNAL_ERROR', '删除客户案例失败', 500)
  }
}

/**
 * Upload document for a customer case
 * POST /specialist/customer-cases/{id}/documents
 */
export async function uploadDocument(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, ['admin', 'specialist'])

    const customerCaseId = event.pathParameters?.id
    if (!customerCaseId) {
      return errorResponse('VALIDATION_ERROR', '客户案例ID不能为空', 400)
    }

    // Find the customer case
    let existingCase: any = null
    let existingSolutionId: string = ''

    const solutions = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
        },
      })
    )

    for (const solution of solutions.Items || []) {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.CUSTOMER_CASES,
          Key: {
            PK: `SOLUTION#${solution.id}`,
            SK: `CUSTOMERCASE#${customerCaseId}`,
          },
        })
      )

      if (result.Item) {
        existingCase = result.Item
        existingSolutionId = solution.id
        break
      }
    }

    if (!existingCase) {
      return errorResponse('NOT_FOUND', '客户案例不存在', 404)
    }

    // Check if user has access
    const hasAccess = await checkUseCaseAccess(user, existingCase.useCaseId)
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', '您没有权限上传文档到该客户案例', 403)
    }

    const body = JSON.parse(event.body || '{}')
    const { fileName, fileContent, contentType } = body

    if (!fileName || !fileContent) {
      return errorResponse('VALIDATION_ERROR', '文件名和文件内容不能为空', 400)
    }

    // Upload to S3
    const documentId = generateId()
    const s3Key = `customer-cases/${customerCaseId}/${documentId}-${fileName}`

    const buffer = Buffer.from(fileContent, 'base64')

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      })
    )

    // Add document to customer case
    const document: Document = {
      id: documentId,
      name: fileName,
      s3Key,
      uploadedAt: new Date().toISOString(),
    }

    const documents = [...(existingCase.documents || []), document]
    const updated: CustomerCase = {
      ...existingCase,
      documents,
      updatedAt: new Date().toISOString(),
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Item: {
          PK: `SOLUTION#${existingSolutionId}`,
          SK: `CUSTOMERCASE#${customerCaseId}`,
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
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // GET /specialist/customer-cases
    if (method === 'GET' && (path === '/specialist/customer-cases' || path === '/specialist/customer-cases/')) {
      return await listCustomerCases(event)
    }

    // POST /specialist/customer-cases
    if (method === 'POST' && (path === '/specialist/customer-cases' || path === '/specialist/customer-cases/')) {
      return await createCustomerCase(event)
    }

    // PUT /specialist/customer-cases/{id}
    if (method === 'PUT' && path.match(/\/specialist\/customer-cases\/[^/]+$/) && !path.includes('documents')) {
      return await updateCustomerCase(event)
    }

    // DELETE /specialist/customer-cases/{id}
    if (method === 'DELETE' && path.match(/\/specialist\/customer-cases\/[^/]+$/) && !path.includes('documents')) {
      return await deleteCustomerCase(event)
    }

    // POST /specialist/customer-cases/{id}/documents
    if (method === 'POST' && path.match(/\/specialist\/customer-cases\/[^/]+\/documents$/)) {
      return await uploadDocument(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
