import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { parse } from 'csv-parse/sync'
import { PutCommand, GetCommand, QueryCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole } from '../utils/auth'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { CSVImportResult, Industry, SubIndustry } from '../types'
import { randomUUID } from 'crypto'

function generateId(): string {
  return randomUUID()
}

interface CSVRow {
  industryName: string
  industryDefinition: string
  subIndustryName: string
  subIndustryDefinition: string
  typicalGlobalCompanies?: string
  typicalChineseCompanies?: string
}

/**
 * Validate CSV format and required columns
 */
function validateCSVFormat(csvContent: string): { valid: boolean; error?: string } {
  if (!csvContent || csvContent.trim().length === 0) {
    return { valid: false, error: 'CSV文件内容为空' }
  }

  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })

    if (!records || records.length === 0) {
      return { valid: false, error: 'CSV文件没有数据行' }
    }

    // Check for required columns (support both formats)
    const firstRecord = records[0]
    const headers = Object.keys(firstRecord)
    
    // Format 1: English headers (Tier 1 Industry, Tier 2 Sub Industry, AWS Definition)
    const hasFormat1 = headers.includes('Tier 1 Industry') && 
                       headers.includes('Tier 2 Sub Industry') && 
                       headers.includes('AWS Definition')
    
    // Format 2: Chinese headers with company lists
    const hasFormat2 = headers.includes('行业名称') && 
                       headers.includes('行业定义') && 
                       headers.includes('子行业名称') && 
                       headers.includes('子行业定义')

    if (!hasFormat1 && !hasFormat2) {
      return {
        valid: false,
        error: 'CSV文件缺少必需的列。需要包含：行业名称、行业定义、子行业名称、子行业定义（或英文格式：Tier 1 Industry, Tier 2 Sub Industry, AWS Definition）',
      }
    }

    return { valid: true }
  } catch (error: any) {
    return { valid: false, error: `CSV格式错误: ${error.message}` }
  }
}

/**
 * Parse CSV content and extract industry/sub-industry data
 */
function parseCSVContent(csvContent: string): CSVRow[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })

  return records.map((record: any) => {
    // Support both English and Chinese formats
    if (record['Tier 1 Industry']) {
      // English format
      return {
        industryName: record['Tier 1 Industry'] || '',
        industryDefinition: record['AWS Definition'] || '',
        subIndustryName: record['Tier 2 Sub Industry'] || '',
        subIndustryDefinition: record['AWS Definition'] || '',
        typicalGlobalCompanies: '',
        typicalChineseCompanies: '',
      }
    } else {
      // Chinese format with company lists
      return {
        industryName: record['行业名称'] || '',
        industryDefinition: record['行业定义'] || '',
        subIndustryName: record['子行业名称'] || '',
        subIndustryDefinition: record['子行业定义'] || '',
        typicalGlobalCompanies: record['典型全球企业'] || '',
        typicalChineseCompanies: record['典型中国企业'] || '',
      }
    }
  })
}

/**
 * Check if an industry already exists by name
 */
async function findIndustryByName(name: string): Promise<Industry | null> {
  // Scan to find industry by name
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAMES.INDUSTRIES,
    FilterExpression: '#name = :name AND SK = :sk',
    ExpressionAttributeNames: {
      '#name': 'name',
    },
    ExpressionAttributeValues: {
      ':name': name,
      ':sk': 'METADATA',
    },
    Limit: 1,
  }))

  if (result.Items && result.Items.length > 0) {
    const item = result.Items[0]
    return {
      id: item.id,
      name: item.name,
      definition: item.definition,
      isVisible: item.isVisible,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
    }
  }

  return null
}

/**
 * Check if a sub-industry already exists by name and industry
 */
async function findSubIndustryByName(industryId: string, name: string): Promise<SubIndustry | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAMES.SUB_INDUSTRIES,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: '#name = :name',
    ExpressionAttributeNames: {
      '#name': 'name',
    },
    ExpressionAttributeValues: {
      ':pk': `INDUSTRY#${industryId}`,
      ':name': name,
    },
    Limit: 1,
  }))

  if (result.Items && result.Items.length > 0) {
    const item = result.Items[0]
    return {
      id: item.id,
      industryId: item.industryId,
      name: item.name,
      definition: item.definition,
      typicalGlobalCompanies: item.typicalGlobalCompanies || [],
      typicalChineseCompanies: item.typicalChineseCompanies || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  return null
}

/**
 * Import CSV data
 * POST /admin/industries/import-csv
 */
export async function importCSV(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = getUserFromEvent(event)
    requireRole(user, 'admin')

    const body = JSON.parse(event.body || '{}')
    const { csvContent } = body

    if (!csvContent || typeof csvContent !== 'string') {
      return errorResponse('VALIDATION_ERROR', 'CSV内容不能为空', 400)
    }

    // Validate CSV format
    const validation = validateCSVFormat(csvContent)
    if (!validation.valid) {
      return errorResponse('VALIDATION_ERROR', validation.error!, 400)
    }

    // Parse CSV content
    const rows = parseCSVContent(csvContent)

    const result: CSVImportResult = {
      successCount: 0,
      skipCount: 0,
      errorCount: 0,
      errors: [],
    }

    const now = new Date().toISOString()
    const processedIndustries = new Map<string, string>() // name -> id

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because of header row and 0-based index

      try {
        // Validate row data
        if (!row.industryName || !row.subIndustryName) {
          result.errorCount++
          result.errors.push(`第${rowNum}行: 行业名称和子行业名称不能为空`)
          continue
        }

        // Check or create industry
        let industryId = processedIndustries.get(row.industryName)
        
        if (!industryId) {
          const existingIndustry = await findIndustryByName(row.industryName)
          
          if (existingIndustry) {
            industryId = existingIndustry.id
            processedIndustries.set(row.industryName, industryId)
            result.skipCount++
          } else {
            // Create new industry
            industryId = generateId()
            const industry: Industry = {
              id: industryId,
              name: row.industryName,
              definition: row.industryDefinition || '',
              isVisible: true,
              createdAt: now,
              updatedAt: now,
              createdBy: user!.userId,
            }

            await docClient.send(new PutCommand({
              TableName: TABLE_NAMES.INDUSTRIES,
              Item: {
                PK: `INDUSTRY#${industryId}`,
                SK: 'METADATA',
                ...industry,
              },
            }))

            processedIndustries.set(row.industryName, industryId)
            result.successCount++
          }
        }

        // Check or create sub-industry
        const existingSubIndustry = await findSubIndustryByName(industryId, row.subIndustryName)
        
        if (existingSubIndustry) {
          result.skipCount++
        } else {
          // Create new sub-industry
          const subIndustryId = generateId()
          
          // Parse company lists
          const globalCompanies = row.typicalGlobalCompanies
            ? row.typicalGlobalCompanies.split(',').map(c => c.trim()).filter(c => c.length > 0)
            : []
          const chineseCompanies = row.typicalChineseCompanies
            ? row.typicalChineseCompanies.split(',').map(c => c.trim()).filter(c => c.length > 0)
            : []

          const subIndustry: SubIndustry = {
            id: subIndustryId,
            industryId,
            name: row.subIndustryName,
            definition: row.subIndustryDefinition || '',
            typicalGlobalCompanies: globalCompanies,
            typicalChineseCompanies: chineseCompanies,
            createdAt: now,
            updatedAt: now,
          }

          await docClient.send(new PutCommand({
            TableName: TABLE_NAMES.SUB_INDUSTRIES,
            Item: {
              PK: `INDUSTRY#${industryId}`,
              SK: `SUBINDUSTRY#${subIndustryId}`,
              ...subIndustry,
            },
          }))

          result.successCount++
        }
      } catch (error: any) {
        result.errorCount++
        result.errors.push(`第${rowNum}行: ${error.message}`)
      }
    }

    return successResponse(result)
  } catch (error: any) {
    if (error.message === 'Insufficient permissions') {
      return errorResponse('FORBIDDEN', '权限不足', 403)
    }
    console.error('Error importing CSV:', error)
    return errorResponse('INTERNAL_ERROR', 'CSV导入失败', 500)
  }
}

/**
 * Lambda handler
 */
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

  try {
    // POST /admin/industries/import-csv
    if (method === 'POST' && path.match(/\/admin\/industries\/import-csv$/)) {
      return await importCSV(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
