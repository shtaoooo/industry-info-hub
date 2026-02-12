# Data Consistency Implementation

This document describes the data consistency protection mechanisms implemented in the Industry Portal backend.

## Overview

The system implements multiple layers of data consistency protection to ensure data integrity and prevent data corruption:

1. **Cascade Delete Checking** - Prevents deletion of entities that have dependent child entities
2. **DynamoDB Transactions** - Ensures atomic operations across multiple items
3. **Optimistic Locking** - Prevents concurrent modification conflicts using version numbers
4. **Error Rollback** - Automatically rolls back failed multi-step operations

## Implementation Details

### 1. Cascade Delete Checking (需求 11.1)

The system validates referential integrity before allowing deletions. This prevents orphaned data and maintains the hierarchical structure.

**Implemented Checks:**

- **Industry → Sub-Industry**: Cannot delete an industry if it has sub-industries
- **Sub-Industry → Use Case**: Cannot delete a sub-industry if it has use cases
- **Solution → Customer Case**: Cannot delete a solution if it has customer cases
- **Use Case ↔ Solution Mapping**: Cannot delete if mappings exist
- **Mapping → Customer Case**: Cannot delete a mapping if customer cases depend on it

**Utility Functions:**

```typescript
// Check if industry has sub-industries
await checkIndustryHasSubIndustries(industryId, subIndustriesTable)

// Check if sub-industry has use cases
await checkSubIndustryHasUseCases(subIndustryId, useCasesTable)

// Check if solution has customer cases
await checkSolutionHasCustomerCases(solutionId, customerCasesTable)

// Check if use case has mappings
await checkUseCaseHasMappings(useCaseId, mappingTable)

// Check if solution has mappings
await checkSolutionHasMappings(solutionId, mappingTable)

// Check if mapping is used by customer cases
await checkMappingHasCustomerCases(solutionId, useCaseId, customerCasesTable)
```

**Example Usage:**

```typescript
// In deleteIndustry function
const hasSubIndustries = await checkIndustryHasSubIndustries(industryId, TABLE_NAMES.SUB_INDUSTRIES)

if (hasSubIndustries) {
  return errorResponse(
    'CONFLICT',
    '该行业包含子行业，无法删除。请先删除所有子行业。',
    409,
    { dependency: 'sub-industries' }
  )
}
```

### 2. DynamoDB Transactions (需求 11.4)

DynamoDB transactions ensure that multiple operations either all succeed or all fail, maintaining atomicity.

**TransactionBuilder Class:**

```typescript
const transaction = new TransactionBuilder()

// Add operations
transaction.addPut(tableName, item, condition, conditionValues)
transaction.addUpdate(tableName, key, updateExpression, values, names, condition)
transaction.addDelete(tableName, key, condition, conditionValues)
transaction.addConditionCheck(tableName, key, condition, conditionValues)

// Execute atomically
await transaction.execute()
```

**Features:**

- Supports up to 100 operations per transaction (DynamoDB limit)
- Automatic rollback on any failure
- Condition checks for validation
- Error handling for transaction cancellation

**Example Usage:**

```typescript
// Create mapping and update related entities atomically
const transaction = new TransactionBuilder()

transaction.addPut(MAPPING_TABLE, {
  PK: `USECASE#${useCaseId}`,
  SK: `SOLUTION#${solutionId}`,
  useCaseId,
  solutionId,
  createdAt: new Date().toISOString(),
})

transaction.addPut(MAPPING_TABLE, {
  PK: `SOLUTION#${solutionId}`,
  SK: `USECASE#${useCaseId}`,
  GSI_PK: `SOLUTION#${solutionId}`,
  GSI_SK: `USECASE#${useCaseId}`,
  useCaseId,
  solutionId,
})

await transaction.execute()
```

### 3. Optimistic Locking (需求 11.5)

Optimistic locking prevents concurrent modification conflicts by using version numbers. Each item has a `version` field that increments on every update.

**How It Works:**

1. Read item and get current version
2. Perform update with condition that version hasn't changed
3. Increment version number in the update
4. If condition fails, return conflict error

**Utility Functions:**

```typescript
// Get item with version
const { item, version } = await getItemWithVersion(tableName, key)

// Create optimistic lock condition
const lockCondition = createOptimisticLockCondition(currentVersion)
// Returns: { ConditionExpression: 'version = :currentVersion', ... }

// Add version increment to update
const { updateExpression, expressionAttributeValues } = addVersionToUpdate(
  updateExpr,
  values,
  currentVersion
)
```

**Example Usage:**

```typescript
// Update industry with optimistic locking
const { item: existing, version: currentVersion } = await getItemWithVersion(
  TABLE_NAMES.INDUSTRIES,
  { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' }
)

// Build update with version increment
const { updateExpression, expressionAttributeValues: finalValues } = addVersionToUpdate(
  `SET name = :name, updatedAt = :updatedAt`,
  { ':name': newName, ':updatedAt': now },
  currentVersion
)

// Add optimistic lock condition
const lockCondition = createOptimisticLockCondition(currentVersion)

try {
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAMES.INDUSTRIES,
    Key: { PK: `INDUSTRY#${industryId}`, SK: 'METADATA' },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: {
      ...finalValues,
      ...lockCondition.ExpressionAttributeValues,
    },
    ConditionExpression: lockCondition.ConditionExpression,
  }))
} catch (error: any) {
  if (error.name === 'ConditionalCheckFailedException') {
    return errorResponse('CONFLICT', '数据已被其他用户修改，请刷新后重试', 409)
  }
  throw error
}
```

**Version Field:**

- Initialized to 0 when item is created
- Incremented by 1 on every update
- Checked before update to detect concurrent modifications

### 4. Error Rollback Handling

The transaction system automatically handles rollback on failures:

**Transaction Cancellation:**

```typescript
export async function executeTransaction(transactItems) {
  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: transactItems,
    }))
  } catch (error: any) {
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
```

**Error Handling Strategy:**

1. All operations in a transaction are atomic
2. If any operation fails, all changes are rolled back
3. Specific error messages for different failure types
4. Concurrent modification errors are detected and reported

## Validation Helper

The `validateReferentialIntegrity` function provides a generic way to check multiple referential integrity constraints:

```typescript
await validateReferentialIntegrity([
  {
    entityType: 'industry',
    entityId: industryId,
    checkFunction: () => checkIndustryHasSubIndustries(industryId, TABLE_NAMES.SUB_INDUSTRIES),
    errorMessage: '该行业包含子行业，无法删除',
  },
  // Add more checks as needed
])
```

## Testing

The consistency utilities should be tested with:

1. **Unit Tests**: Test each utility function independently
2. **Integration Tests**: Test transaction behavior with real DynamoDB
3. **Concurrent Tests**: Test optimistic locking with simultaneous updates
4. **Rollback Tests**: Verify transactions roll back on failures

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Check referential integrity** before deletions
3. **Use optimistic locking** for updates to prevent conflicts
4. **Handle ConditionalCheckFailedException** gracefully
5. **Provide clear error messages** to users
6. **Log transaction failures** for debugging
7. **Keep transactions small** (under 100 operations)
8. **Initialize version field** to 0 for new items

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| CONFLICT | Referential integrity violation or concurrent modification | 409 |
| VALIDATION_ERROR | Invalid input data | 400 |
| NOT_FOUND | Entity not found | 404 |
| INTERNAL_ERROR | Server error | 500 |

## Future Enhancements

1. **Audit Logging**: Track all data modifications with version history
2. **Soft Deletes**: Mark items as deleted instead of removing them
3. **Batch Operations**: Support for bulk updates with transactions
4. **Retry Logic**: Automatic retry for transient failures
5. **Deadlock Detection**: Detect and resolve circular dependencies
