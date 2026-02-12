import { docClient } from './dynamodb'
import { 
  TransactWriteCommand, 
  TransactWriteCommandInput,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'

/**
 * Check if an industry has sub-industries before deletion
 */
export async function checkIndustryHasSubIndustries(
  industryId: string,
  subIndustriesTable: string
): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: subIndustriesTable,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `INDUSTRY#${industryId}`,
    },
    Limit: 1,
  }))
  
  return (result.Items?.length || 0) > 0
}

/**
 * Check if a sub-industry has use cases before deletion
 */
export async function checkSubIndustryHasUseCases(
  subIndustryId: string,
  useCasesTable: string
): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: useCasesTable,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `SUBINDUSTRY#${subIndustryId}`,
    },
    Limit: 1,
  }))
  
  return (result.Items?.length || 0) > 0
}

/**
 * Check if a solution has customer cases before deletion
 */
export async function checkSolutionHasCustomerCases(
  solutionId: string,
  customerCasesTable: string
): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: customerCasesTable,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `SOLUTION#${solutionId}`,
    },
    Limit: 1,
  }))
  
  return (result.Items?.length || 0) > 0
}

/**
 * Check if a use case has mappings before deletion
 */
export async function checkUseCaseHasMappings(
  useCaseId: string,
  mappingTable: string
): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: mappingTable,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USECASE#${useCaseId}`,
    },
    Limit: 1,
  }))
  
  return (result.Items?.length || 0) > 0
}

/**
 * Check if a solution has mappings before deletion
 */
export async function checkSolutionHasMappings(
  solutionId: string,
  mappingTable: string
): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: mappingTable,
    IndexName: 'ReverseIndex',
    KeyConditionExpression: 'GSI_PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `SOLUTION#${solutionId}`,
    },
    Limit: 1,
  }))
  
  return (result.Items?.length || 0) > 0
}

/**
 * Check if a mapping is used by customer cases
 */
export async function checkMappingHasCustomerCases(
  solutionId: string,
  useCaseId: string,
  customerCasesTable: string
): Promise<boolean> {
  const result = await docClient.send(new ScanCommand({
    TableName: customerCasesTable,
    FilterExpression: 'solutionId = :solutionId AND useCaseId = :useCaseId',
    ExpressionAttributeValues: {
      ':solutionId': solutionId,
      ':useCaseId': useCaseId,
    },
    Limit: 1,
  }))
  
  return (result.Items?.length || 0) > 0
}

/**
 * Execute a transactional write operation
 * This ensures all operations succeed or all fail (atomicity)
 */
export async function executeTransaction(
  transactItems: TransactWriteCommandInput['TransactItems']
): Promise<void> {
  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: transactItems,
    }))
  } catch (error: any) {
    // Handle transaction cancellation
    if (error.name === 'TransactionCanceledException') {
      const reasons = error.CancellationReasons || []
      const conflictReason = reasons.find((r: any) => r.Code === 'ConditionalCheckFailed')
      
      if (conflictReason) {
        throw new Error('Concurrent modification detected. Please retry the operation.')
      }
      
      throw new Error('Transaction failed: ' + JSON.stringify(reasons))
    }
    
    throw error
  }
}

/**
 * Get item with version for optimistic locking
 */
export async function getItemWithVersion(
  tableName: string,
  key: Record<string, any>
): Promise<{ item: any; version: number }> {
  const result = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: key,
  }))
  
  if (!result.Item) {
    throw new Error('Item not found')
  }
  
  return {
    item: result.Item,
    version: result.Item.version || 0,
  }
}

/**
 * Update item with optimistic locking
 * Increments version number and checks that the current version matches
 */
export function createOptimisticLockCondition(currentVersion: number): {
  ConditionExpression: string
  ExpressionAttributeValues: Record<string, any>
} {
  return {
    ConditionExpression: 'attribute_not_exists(version) OR version = :currentVersion',
    ExpressionAttributeValues: {
      ':currentVersion': currentVersion,
    },
  }
}

/**
 * Add version field to update expression
 */
export function addVersionToUpdate(
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  currentVersion: number
): { updateExpression: string; expressionAttributeValues: Record<string, any> } {
  const newVersion = currentVersion + 1
  
  // Add version increment to update expression
  const versionUpdate = 'version = :newVersion'
  const updatedExpression = updateExpression.includes('SET')
    ? updateExpression.replace('SET ', `SET ${versionUpdate}, `)
    : `SET ${versionUpdate}`
  
  return {
    updateExpression: updatedExpression,
    expressionAttributeValues: {
      ...expressionAttributeValues,
      ':newVersion': newVersion,
    },
  }
}

/**
 * Validate referential integrity before deletion
 */
export interface ReferentialIntegrityCheck {
  entityType: string
  entityId: string
  checkFunction: () => Promise<boolean>
  errorMessage: string
}

export async function validateReferentialIntegrity(
  checks: ReferentialIntegrityCheck[]
): Promise<void> {
  for (const check of checks) {
    const hasReferences = await check.checkFunction()
    if (hasReferences) {
      throw new Error(check.errorMessage)
    }
  }
}

/**
 * Rollback helper - stores operations for potential rollback
 */
export class TransactionBuilder {
  private operations: NonNullable<TransactWriteCommandInput['TransactItems']>
  
  constructor() {
    this.operations = []
  }
  
  addPut(tableName: string, item: Record<string, any>, condition?: string, conditionValues?: Record<string, any>) {
    const putItem: any = {
      Put: {
        TableName: tableName,
        Item: item,
      },
    }
    
    if (condition && conditionValues) {
      putItem.Put.ConditionExpression = condition
      putItem.Put.ExpressionAttributeValues = conditionValues
    }
    
    this.operations.push(putItem)
  }
  
  addUpdate(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    condition?: string
  ) {
    const updateItem: any = {
      Update: {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      },
    }
    
    if (expressionAttributeNames) {
      updateItem.Update.ExpressionAttributeNames = expressionAttributeNames
    }
    
    if (condition) {
      updateItem.Update.ConditionExpression = condition
    }
    
    this.operations.push(updateItem)
  }
  
  addDelete(tableName: string, key: Record<string, any>, condition?: string, conditionValues?: Record<string, any>) {
    const deleteItem: any = {
      Delete: {
        TableName: tableName,
        Key: key,
      },
    }
    
    if (condition && conditionValues) {
      deleteItem.Delete.ConditionExpression = condition
      deleteItem.Delete.ExpressionAttributeValues = conditionValues
    }
    
    this.operations.push(deleteItem)
  }
  
  addConditionCheck(tableName: string, key: Record<string, any>, condition: string, conditionValues: Record<string, any>) {
    this.operations.push({
      ConditionCheck: {
        TableName: tableName,
        Key: key,
        ConditionExpression: condition,
        ExpressionAttributeValues: conditionValues,
      },
    })
  }
  
  async execute(): Promise<void> {
    if (this.operations.length === 0) {
      return
    }
    
    // DynamoDB transactions support max 100 operations
    if (this.operations.length > 100) {
      throw new Error('Transaction exceeds maximum of 100 operations')
    }
    
    await executeTransaction(this.operations)
  }
  
  getOperations() {
    return this.operations
  }
  
  clear() {
    this.operations = []
  }
}
