import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { successResponse, errorResponse } from '../utils/response'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { s3Client, BUCKET_NAME } from '../utils/s3'

/**
 * Get all visible industries
 * GET /public/industries
 */
export async function listVisibleIndustries(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        FilterExpression: 'SK = :sk AND isVisible = :visible',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
          ':visible': true,
        },
      })
    )

    const industries = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      definition: item.definition,
      createdAt: item.createdAt,
    }))

    return successResponse(industries)
  } catch (error: any) {
    console.error('Error listing visible industries:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业列表失败', 500)
  }
}

/**
 * Get industry details
 * GET /public/industries/{id}
 */
export async function getIndustryDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
      })
    )

    if (!result.Item || !result.Item.isVisible) {
      return errorResponse('NOT_FOUND', '行业不存在或不可见', 404)
    }

    const industry = {
      id: result.Item.id,
      name: result.Item.name,
      definition: result.Item.definition,
      createdAt: result.Item.createdAt,
    }

    return successResponse(industry)
  } catch (error: any) {
    console.error('Error getting industry details:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业详情失败', 500)
  }
}

/**
 * Get sub-industries for an industry
 * GET /public/industries/{id}/sub-industries
 */
export async function listSubIndustries(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) {
      return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)
    }

    // Check if industry is visible
    const industry = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
      })
    )

    if (!industry.Item || !industry.Item.isVisible) {
      return errorResponse('NOT_FOUND', '行业不存在或不可见', 404)
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `INDUSTRY#${industryId}`,
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
    }))

    return successResponse(subIndustries)
  } catch (error: any) {
    console.error('Error listing sub-industries:', error)
    return errorResponse('INTERNAL_ERROR', '获取子行业列表失败', 500)
  }
}

/**
 * Get use cases for a sub-industry
 * GET /public/sub-industries/{id}/use-cases
 */
export async function listUseCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) {
      return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USE_CASES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `SUBINDUSTRY#${subIndustryId}`,
        },
      })
    )

    const useCases = (result.Items || []).map((item) => ({
      id: item.id,
      subIndustryId: item.subIndustryId,
      industryId: item.industryId,
      name: item.name,
      description: item.description,
      createdAt: item.createdAt,
    }))

    return successResponse(useCases)
  } catch (error: any) {
    console.error('Error listing use cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例列表失败', 500)
  }
}

/**
 * Get use case details
 * GET /public/use-cases/{id}
 */
export async function getUseCaseDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const useCaseId = event.pathParameters?.id
    if (!useCaseId) {
      return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)
    }

    // Find the use case
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
          const useCase = {
            id: result.Item.id,
            subIndustryId: result.Item.subIndustryId,
            industryId: result.Item.industryId,
            name: result.Item.name,
            description: result.Item.description,
            documents: result.Item.documents || [],
            createdAt: result.Item.createdAt,
          }

          return successResponse(useCase)
        }
      }
    }

    return errorResponse('NOT_FOUND', '用例不存在', 404)
  } catch (error: any) {
    console.error('Error getting use case details:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例详情失败', 500)
  }
}

/**
 * Get solutions for a use case
 * GET /public/use-cases/{id}/solutions
 */
export async function getSolutionsForUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const useCaseId = event.pathParameters?.id
    if (!useCaseId) {
      return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)
    }

    // Get mappings
    const mappings = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.MAPPING,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USECASE#${useCaseId}`,
        },
      })
    )

    const solutions = []
    for (const mapping of mappings.Items || []) {
      const solution = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.SOLUTIONS,
          Key: { PK: `SOLUTION#${mapping.solutionId}`, SK: 'METADATA' },
        })
      )

      if (solution.Item) {
        solutions.push({
          id: solution.Item.id,
          name: solution.Item.name,
          description: solution.Item.description,
          createdAt: solution.Item.createdAt,
        })
      }
    }

    return successResponse(solutions)
  } catch (error: any) {
    console.error('Error getting solutions for use case:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案列表失败', 500)
  }
}

/**
 * Get solution details
 * GET /public/solutions/{id}
 */
export async function getSolutionDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
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

    const solution = {
      id: result.Item.id,
      name: result.Item.name,
      description: result.Item.description,
      detailMarkdownUrl: result.Item.detailMarkdownUrl,
      createdAt: result.Item.createdAt,
    }

    return successResponse(solution)
  } catch (error: any) {
    console.error('Error getting solution details:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案详情失败', 500)
  }
}

/**
 * Get markdown content for a solution
 * GET /public/solutions/{id}/detail-markdown
 */
export async function getSolutionMarkdown(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
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

    if (!result.Item || !result.Item.detailMarkdownUrl) {
      return errorResponse('NOT_FOUND', '解决方案详细介绍不存在', 404)
    }

    // Generate presigned URL
    const s3Key = `solutions/${solutionId}/detail.md`
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }),
      { expiresIn: 3600 }
    )

    return successResponse({ url: presignedUrl })
  } catch (error: any) {
    console.error('Error getting solution markdown:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案详细介绍失败', 500)
  }
}

/**
 * Get customer cases for a solution
 * GET /public/solutions/{id}/customer-cases
 */
export async function getCustomerCasesForSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const solutionId = event.pathParameters?.id
    if (!solutionId) {
      return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `SOLUTION#${solutionId}`,
        },
      })
    )

    const customerCases = (result.Items || []).map((item) => ({
      id: item.id,
      solutionId: item.solutionId,
      useCaseId: item.useCaseId,
      name: item.name,
      description: item.description,
      documents: item.documents || [],
      createdAt: item.createdAt,
    }))

    return successResponse(customerCases)
  } catch (error: any) {
    console.error('Error getting customer cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取客户案例列表失败', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod
  const path = event.rawPath || event.path || event.resource
  
  console.log('Full Event:', JSON.stringify(event, null, 2))
  console.log('Method:', method)
  console.log('Path:', path)
  console.log('RouteKey:', event.routeKey)

  try {
    // GET /public/industries
    if (method === 'GET' && (path === '/public/industries' || path === '/public/industries/')) {
      return await listVisibleIndustries(event)
    }

    // GET /public/industries/{id}
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+$/) && !path.includes('sub-industries')) {
      return await getIndustryDetails(event)
    }

    // GET /public/industries/{id}/sub-industries
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+\/sub-industries$/)) {
      return await listSubIndustries(event)
    }

    // GET /public/sub-industries/{id}/use-cases
    if (method === 'GET' && path.match(/\/public\/sub-industries\/[^/]+\/use-cases$/)) {
      return await listUseCases(event)
    }

    // GET /public/use-cases/{id}
    if (method === 'GET' && path.match(/\/public\/use-cases\/[^/]+$/) && !path.includes('solutions')) {
      return await getUseCaseDetails(event)
    }

    // GET /public/use-cases/{id}/solutions
    if (method === 'GET' && path.match(/\/public\/use-cases\/[^/]+\/solutions$/)) {
      return await getSolutionsForUseCase(event)
    }

    // GET /public/solutions/{id}
    if (
      method === 'GET' &&
      path.match(/\/public\/solutions\/[^/]+$/) &&
      !path.includes('detail-markdown') &&
      !path.includes('customer-cases')
    ) {
      return await getSolutionDetails(event)
    }

    // GET /public/solutions/{id}/detail-markdown
    if (method === 'GET' && path.match(/\/public\/solutions\/[^/]+\/detail-markdown$/)) {
      return await getSolutionMarkdown(event)
    }

    // GET /public/solutions/{id}/customer-cases
    if (method === 'GET' && path.match(/\/public\/solutions\/[^/]+\/customer-cases$/)) {
      return await getCustomerCasesForSolution(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
