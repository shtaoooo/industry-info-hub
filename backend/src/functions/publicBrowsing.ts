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
 * Uses VisibilityIndex GSI: PK=isVisibleStr('true'), SK=createdAt
 */
export async function listVisibleIndustries(_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        IndexName: 'VisibilityIndex',
        KeyConditionExpression: 'isVisibleStr = :v',
        ExpressionAttributeValues: { ':v': 'true' },
      })
    )

    const industries = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      definition: item.definition,
      imageUrl: item.imageUrl,
      icon: item.icon,
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
 * PK: id, SK: METADATA
 */
export async function getIndustryDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: industryId, SK: 'METADATA' },
      })
    )

    if (!result.Item || !result.Item.isVisible) {
      return errorResponse('NOT_FOUND', '行业不存在或不可见', 404)
    }

    return successResponse({
      id: result.Item.id,
      name: result.Item.name,
      definition: result.Item.definition,
      definitionCn: result.Item.definitionCn,
      imageUrl: result.Item.imageUrl,
      icon: result.Item.icon,
      createdAt: result.Item.createdAt,
    })
  } catch (error: any) {
    console.error('Error getting industry details:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业详情失败', 500)
  }
}

/**
 * Get sub-industries for an industry
 * GET /public/industries/{id}/sub-industries
 * Uses IndustryIndex GSI on SubIndustries: PK=industryId, SK=priority
 */
export async function listSubIndustries(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)

    const industry = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: industryId, SK: 'METADATA' },
      })
    )

    if (!industry.Item || !industry.Item.isVisible) {
      return errorResponse('NOT_FOUND', '行业不存在或不可见', 404)
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        IndexName: 'IndustryIndex',
        KeyConditionExpression: 'industryId = :industryId',
        ExpressionAttributeValues: { ':industryId': industryId },
        ScanIndexForward: false, // descending by priority
      })
    )

    const subIndustries = (result.Items || []).map((item) => ({
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
 * SubIndustry: GetCommand PK=id, SK=METADATA
 * UseCases: SubIndustryIndex GSI PK=subIndustryId, SK=recommendationScore (desc)
 */
export async function listUseCases(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const subIndustryId = event.pathParameters?.id
    if (!subIndustryId) return errorResponse('VALIDATION_ERROR', '子行业ID不能为空', 400)

    const subIndustryResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SUB_INDUSTRIES,
        Key: { PK: subIndustryId, SK: 'METADATA' },
      })
    )

    if (!subIndustryResult.Item) {
      return errorResponse('NOT_FOUND', '子行业不存在', 404)
    }

    const item = subIndustryResult.Item
    const subIndustry = {
      id: item.id,
      industryId: item.industryId,
      name: item.name,
      definition: item.definition,
      definitionCn: item.definitionCn,
      typicalGlobalCompanies: item.typicalGlobalCompanies || [],
      typicalChineseCompanies: item.typicalChineseCompanies || [],
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USE_CASES,
        IndexName: 'SubIndustryIndex',
        KeyConditionExpression: 'subIndustryId = :subIndustryId',
        ExpressionAttributeValues: { ':subIndustryId': subIndustryId },
        ScanIndexForward: false, // descending by recommendationScore
      })
    )

    const useCases = (result.Items || []).map((uc) => ({
      id: uc.id,
      subIndustryId: uc.subIndustryId,
      industryId: uc.industryId,
      name: uc.name,
      description: uc.description,
      businessScenario: uc.businessScenario,
      customerPainPoints: uc.customerPainPoints,
      targetAudience: uc.targetAudience,
      communicationScript: uc.communicationScript,
      recommendationScore: uc.recommendationScore || 3,
      createdAt: uc.createdAt,
    }))

    return successResponse({ subIndustry, useCases })
  } catch (error: any) {
    console.error('Error listing use cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例列表失败', 500)
  }
}

/**
 * Get use case details
 * GET /public/use-cases/{id}
 * PK: id, SK: METADATA
 */
export async function getUseCaseDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const useCaseId = event.pathParameters?.id
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USE_CASES,
        Key: { PK: useCaseId, SK: 'METADATA' },
      })
    )

    if (!result.Item) return errorResponse('NOT_FOUND', '用例不存在', 404)

    const item = result.Item
    return successResponse({
      id: item.id,
      subIndustryId: item.subIndustryId,
      industryId: item.industryId,
      name: item.name,
      description: item.description,
      businessScenario: item.businessScenario,
      customerPainPoints: item.customerPainPoints,
      targetAudience: item.targetAudience,
      communicationScript: item.communicationScript,
      documents: item.documents || [],
      createdAt: item.createdAt,
    })
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
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

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
 * PK: id, SK: METADATA
 */
export async function getSolutionDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const solutionId = event.pathParameters?.id
    if (!solutionId) return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: solutionId, SK: 'METADATA' },
      })
    )

    if (!result.Item) return errorResponse('NOT_FOUND', '解决方案不存在', 404)

    return successResponse({
      id: result.Item.id,
      name: result.Item.name,
      description: result.Item.description,
      detailMarkdownUrl: result.Item.detailMarkdownUrl,
      createdAt: result.Item.createdAt,
    })
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
    if (!solutionId) return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.SOLUTIONS,
        Key: { PK: solutionId, SK: 'METADATA' },
      })
    )

    if (!result.Item || !result.Item.detailMarkdownUrl) {
      return errorResponse('NOT_FOUND', '解决方案详细介绍不存在', 404)
    }

    const s3Key = `solutions/${solutionId}/detail.md`
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }),
      { expiresIn: 3600 }
    )

    return successResponse({ url: presignedUrl })
  } catch (error: any) {
    console.error('Error getting solution markdown:', error)
    return errorResponse('INTERNAL_ERROR', '获取解决方案详细介绍失败', 500)
  }
}

/**
 * Get customer cases for a use case
 * GET /public/use-cases/{id}/customer-cases
 * 
 * Note: Uses Scan because useCaseIds is an array (one case can have multiple use cases)
 * TODO: Consider using composite data model (separate index items per useCaseId) for better performance
 */
export async function getCustomerCasesForUseCase(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const useCaseId = event.pathParameters?.id
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        FilterExpression: 'SK = :sk AND contains(useCaseIds, :useCaseId)',
        ExpressionAttributeValues: { 
          ':sk': 'METADATA',
          ':useCaseId': useCaseId,
        },
      })
    )

    const customerCases = (result.Items || [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        accountId: item.accountId,
        partner: item.partner,
        useCaseIds: item.useCaseIds || [],
        challenge: item.challenge,
        solution: item.solution,
        benefit: item.benefit,
        documents: item.documents || [],
        createdAt: item.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return successResponse(customerCases)
  } catch (error: any) {
    console.error('Error getting customer cases for use case:', error)
    return errorResponse('INTERNAL_ERROR', '获取客户案例列表失败', 500)
  }
}

/**
 * Get customer cases for a solution
 * GET /public/solutions/{id}/customer-cases
 */
export async function getCustomerCasesForSolution(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const solutionId = event.pathParameters?.id
    if (!solutionId) return errorResponse('VALIDATION_ERROR', '解决方案ID不能为空', 400)

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'METADATA' },
      })
    )

    const customerCases = (result.Items || [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        accountId: item.accountId,
        partner: item.partner,
        useCaseIds: item.useCaseIds || [],
        challenge: item.challenge,
        solution: item.solution,
        benefit: item.benefit,
        documents: item.documents || [],
        createdAt: item.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return successResponse(customerCases)
  } catch (error: any) {
    console.error('Error getting customer cases:', error)
    return errorResponse('INTERNAL_ERROR', '获取客户案例列表失败', 500)
  }
}

/**
 * Get customer cases for an account
 * GET /public/accounts/{id}/customer-cases
 * Uses AccountIndex GSI: PK=accountId, SK=createdAt
 */
export async function getCustomerCasesForAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const accountId = event.pathParameters?.id
    if (!accountId) return errorResponse('VALIDATION_ERROR', '账户ID不能为空', 400)

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        IndexName: 'AccountIndex',
        KeyConditionExpression: 'accountId = :accountId',
        ExpressionAttributeValues: { ':accountId': accountId },
        ScanIndexForward: false, // Sort by createdAt descending
      })
    )

    const customerCases = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      accountId: item.accountId,
      partner: item.partner,
      useCaseIds: item.useCaseIds || [],
      challenge: item.challenge,
      solution: item.solution,
      benefit: item.benefit,
      documents: item.documents || [],
      createdAt: item.createdAt,
    }))

    return successResponse(customerCases)
  } catch (error: any) {
    console.error('Error getting customer cases for account:', error)
    return errorResponse('INTERNAL_ERROR', '获取账户客户案例列表失败', 500)
  }
}

/**
 * Get customer cases for an industry
 * GET /public/industries/{id}/customer-cases
 * Uses IndustryIndex GSI: PK=industryId, SK=createdAt
 */
export async function getCustomerCasesForIndustry(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        IndexName: 'IndustryIndex',
        KeyConditionExpression: 'industryId = :industryId',
        ExpressionAttributeValues: { ':industryId': industryId },
        ScanIndexForward: false,
      })
    )

    const customerCases = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      accountId: item.accountId,
      partner: item.partner,
      useCaseIds: item.useCaseIds || [],
      challenge: item.challenge,
      solution: item.solution,
      benefit: item.benefit,
      createdAt: item.createdAt,
    }))

    return successResponse(customerCases)
  } catch (error: any) {
    console.error('Error getting customer cases for industry:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业客户案例失败', 500)
  }
}

/**
 * Get news for an industry
 * GET /public/industries/{id}/news
 */
export async function getIndustryNews(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)

    const industry = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: industryId, SK: 'METADATA' },
      })
    )

    if (!industry.Item || !industry.Item.isVisible) {
      return errorResponse('NOT_FOUND', '行业不存在或不可见', 404)
    }

    const limitParam = event.queryStringParameters?.limit
    const queryParams: any = {
      TableName: TABLE_NAMES.NEWS,
      IndexName: 'IndustryIndex',
      KeyConditionExpression: 'industryId = :industryId',
      ExpressionAttributeValues: { ':industryId': industryId },
      ScanIndexForward: false,
    }
    if (limitParam) queryParams.Limit = parseInt(limitParam, 10)

    const result = await docClient.send(new QueryCommand(queryParams))

    return successResponse(
      (result.Items || []).map((item) => ({
        id: item.id,
        industryId: item.industryId,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        externalUrl: item.externalUrl,
        author: item.author,
        publishedAt: item.publishedAt,
      }))
    )
  } catch (error: any) {
    console.error('Error getting industry news:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业新闻失败', 500)
  }
}

/**
 * Get blogs for an industry
 * GET /public/industries/{id}/blogs
 */
export async function getIndustryBlogs(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const industryId = event.pathParameters?.id
    if (!industryId) return errorResponse('VALIDATION_ERROR', '行业ID不能为空', 400)

    const industry = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.INDUSTRIES,
        Key: { PK: industryId, SK: 'METADATA' },
      })
    )

    if (!industry.Item || !industry.Item.isVisible) {
      return errorResponse('NOT_FOUND', '行业不存在或不可见', 404)
    }

    const limitParam = event.queryStringParameters?.limit
    const queryParams: any = {
      TableName: TABLE_NAMES.BLOGS,
      IndexName: 'IndustryIndex',
      KeyConditionExpression: 'industryId = :industryId',
      ExpressionAttributeValues: { ':industryId': industryId },
      ScanIndexForward: false,
    }
    if (limitParam) queryParams.Limit = parseInt(limitParam, 10)

    const result = await docClient.send(new QueryCommand(queryParams))

    return successResponse(
      (result.Items || []).map((item) => ({
        id: item.id,
        industryId: item.industryId,
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        externalUrl: item.externalUrl,
        author: item.author,
        publishedAt: item.publishedAt,
      }))
    )
  } catch (error: any) {
    console.error('Error getting industry blogs:', error)
    return errorResponse('INTERNAL_ERROR', '获取行业博客失败', 500)
  }
}

/**
 * Get news detail
 * GET /public/news/{id}
 */
export async function getNewsDetail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const newsId = event.pathParameters?.id
    if (!newsId) return errorResponse('VALIDATION_ERROR', '新闻ID不能为空', 400)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.NEWS,
        Key: { PK: `NEWS#${newsId}`, SK: 'METADATA' },
      })
    )

    if (!result.Item) return errorResponse('NOT_FOUND', '新闻不存在', 404)

    return successResponse({
      id: result.Item.id,
      industryId: result.Item.industryId,
      title: result.Item.title,
      summary: result.Item.summary,
      content: result.Item.content,
      imageUrl: result.Item.imageUrl,
      externalUrl: result.Item.externalUrl,
      author: result.Item.author,
      publishedAt: result.Item.publishedAt,
    })
  } catch (error: any) {
    console.error('Error getting news detail:', error)
    return errorResponse('INTERNAL_ERROR', '获取新闻详情失败', 500)
  }
}

/**
 * Get blog detail
 * GET /public/blogs/{id}
 */
export async function getBlogDetail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const blogId = event.pathParameters?.id
    if (!blogId) return errorResponse('VALIDATION_ERROR', '博客ID不能为空', 400)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.BLOGS,
        Key: { PK: `BLOG#${blogId}`, SK: 'METADATA' },
      })
    )

    if (!result.Item) return errorResponse('NOT_FOUND', '博客不存在', 404)

    return successResponse({
      id: result.Item.id,
      industryId: result.Item.industryId,
      title: result.Item.title,
      summary: result.Item.summary,
      content: result.Item.content,
      imageUrl: result.Item.imageUrl,
      externalUrl: result.Item.externalUrl,
      author: result.Item.author,
      publishedAt: result.Item.publishedAt,
    })
  } catch (error: any) {
    console.error('Error getting blog detail:', error)
    return errorResponse('INTERNAL_ERROR', '获取博客详情失败', 500)
  }
}

/**
 * Get customer case detail
 * GET /public/customer-cases/{id}
 */
export async function getCustomerCaseDetail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const caseId = event.pathParameters?.id
    if (!caseId) return errorResponse('VALIDATION_ERROR', '案例ID不能为空', 400)

    console.log(`[CustomerCaseDetail] Fetching customer case: ${caseId}`)

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.CUSTOMER_CASES,
        Key: { PK: caseId, SK: 'METADATA' },
      })
    )

    if (!result.Item) {
      console.log(`[CustomerCaseDetail] Customer case not found: ${caseId}`)
      return errorResponse('NOT_FOUND', '客户案例不存在', 404)
    }

    const item = result.Item
    console.log(`[CustomerCaseDetail] Customer case found: ${item.name}, accountId: ${item.accountId}`)

    // Fetch account info if accountId exists
    let account = null
    if (item.accountId) {
      try {
        console.log(`[CustomerCaseDetail] Fetching account: ${item.accountId}`)
        const accountResult = await docClient.send(
          new GetCommand({
            TableName: TABLE_NAMES.ACCOUNTS,
            Key: { PK: `ACCOUNT#${item.accountId}`, SK: 'METADATA' },
          })
        )
        if (accountResult.Item) {
          account = {
            id: accountResult.Item.id,
            name: accountResult.Item.name,
            type: accountResult.Item.type,
            description: accountResult.Item.description,
            logoUrl: accountResult.Item.logoUrl,
            website: accountResult.Item.website,
          }
          console.log(`[CustomerCaseDetail] Account found: ${account.name}`)
        } else {
          console.warn(`[CustomerCaseDetail] Account not found in ACCOUNTS table: ${item.accountId}`)
        }
      } catch (accountError: any) {
        console.error(`[CustomerCaseDetail] Error fetching account ${item.accountId}:`, accountError)
        // Continue without account info instead of failing the entire request
      }
    }

    return successResponse({
      id: item.id,
      name: item.name,
      accountId: item.accountId,
      partner: item.partner,
      useCaseIds: item.useCaseIds || [],
      challenge: item.challenge,
      solution: item.solution,
      benefit: item.benefit,
      documents: item.documents || [],
      createdAt: item.createdAt,
      account,
    })
  } catch (error: any) {
    console.error('[CustomerCaseDetail] Error getting customer case detail:', error)
    console.error('[CustomerCaseDetail] Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    })
    return errorResponse('INTERNAL_ERROR', '获取客户案例详情失败', 500)
  }
}

/**
 * Get blogs for a use case
 * GET /public/use-cases/{id}/blogs
 */
export async function getUseCaseBlogs(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const useCaseId = event.pathParameters?.id
    if (!useCaseId) return errorResponse('VALIDATION_ERROR', '用例ID不能为空', 400)

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.BLOGS,
        FilterExpression: 'SK = :sk AND contains(useCaseIds, :useCaseId)',
        ExpressionAttributeValues: {
          ':sk': 'METADATA',
          ':useCaseId': useCaseId,
        },
      })
    )

    const blogs = (result.Items || [])
      .map((item) => ({
        id: item.id,
        industryId: item.industryId,
        useCaseIds: item.useCaseIds || [],
        title: item.title,
        summary: item.summary,
        imageUrl: item.imageUrl,
        externalUrl: item.externalUrl,
        author: item.author,
        publishedAt: item.publishedAt,
      }))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    return successResponse(blogs)
  } catch (error: any) {
    console.error('Error getting use case blogs:', error)
    return errorResponse('INTERNAL_ERROR', '获取用例博客失败', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod
  const path = event.rawPath || event.path || event.resource

  console.log('Method:', method, 'Path:', path)

  try {
    if (method === 'GET' && (path === '/public/industries' || path === '/public/industries/')) {
      return await listVisibleIndustries(event)
    }
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+\/?$/) && !path.includes('sub-industries')) {
      return await getIndustryDetails(event)
    }
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+\/sub-industries\/?$/)) {
      return await listSubIndustries(event)
    }
    if (method === 'GET' && path.match(/\/public\/sub-industries\/[^/]+\/use-cases\/?$/)) {
      return await listUseCases(event)
    }
    if (method === 'GET' && path.match(/\/public\/use-cases\/[^/]+\/?$/) && !path.includes('solutions') && !path.includes('blogs') && !path.includes('customer-cases')) {
      return await getUseCaseDetails(event)
    }
    if (method === 'GET' && path.match(/\/public\/use-cases\/[^/]+\/solutions\/?$/)) {
      return await getSolutionsForUseCase(event)
    }
    if (method === 'GET' && path.match(/\/public\/use-cases\/[^/]+\/blogs\/?$/)) {
      return await getUseCaseBlogs(event)
    }
    if (method === 'GET' && path.match(/\/public\/use-cases\/[^/]+\/customer-cases\/?$/)) {
      return await getCustomerCasesForUseCase(event)
    }
    if (method === 'GET' && path.match(/\/public\/solutions\/[^/]+\/?$/) && !path.includes('detail-markdown') && !path.includes('customer-cases')) {
      return await getSolutionDetails(event)
    }
    if (method === 'GET' && path.match(/\/public\/solutions\/[^/]+\/detail-markdown\/?$/)) {
      return await getSolutionMarkdown(event)
    }
    if (method === 'GET' && path.match(/\/public\/solutions\/[^/]+\/customer-cases\/?$/)) {
      return await getCustomerCasesForSolution(event)
    }
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+\/news\/?$/)) {
      return await getIndustryNews(event)
    }
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+\/blogs\/?$/)) {
      return await getIndustryBlogs(event)
    }
    if (method === 'GET' && path.match(/\/public\/industries\/[^/]+\/customer-cases\/?$/)) {
      return await getCustomerCasesForIndustry(event)
    }
    if (method === 'GET' && path.match(/\/public\/news\/[^/]+\/?$/)) {
      return await getNewsDetail(event)
    }
    if (method === 'GET' && path.match(/\/public\/blogs\/[^/]+\/?$/)) {
      return await getBlogDetail(event)
    }
    if (method === 'GET' && path.match(/\/public\/customer-cases\/[^/]+\/?$/)) {
      return await getCustomerCaseDetail(event)
    }
    if (method === 'GET' && path.match(/\/public\/accounts\/[^/]+\/customer-cases\/?$/)) {
      return await getCustomerCasesForAccount(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
