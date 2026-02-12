import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { successResponse, errorResponse } from '../utils/response'
import { getUserFromEvent, requireRole, createCognitoUser, updateCognitoUser, deleteCognitoUser } from '../utils/auth'
import { User } from '../types'
import { docClient, TABLE_NAMES } from '../utils/dynamodb'
import { PutCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const USERS_TABLE = TABLE_NAMES.USERS

/**
 * Create a new user
 * POST /admin/users
 */
export async function createUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const currentUser = getUserFromEvent(event)
    requireRole(currentUser, 'admin')
    
    const body = JSON.parse(event.body || '{}')
    const { email, role, assignedIndustries } = body
    
    if (!email || !role) {
      return errorResponse('VALIDATION_ERROR', 'Email and role are required', 400)
    }
    
    if (!['admin', 'specialist', 'user'].includes(role)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid role', 400)
    }
    
    // Create user in Cognito
    const cognitoResponse = await createCognitoUser(email, role, assignedIndustries)
    const userId = cognitoResponse.User?.Username || ''
    
    // Store user metadata in DynamoDB
    const user: User = {
      userId,
      email,
      role,
      assignedIndustries: role === 'specialist' ? assignedIndustries : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
        ...user,
      },
    }))
    
    return successResponse(user)
  } catch (error: any) {
    console.error('Error creating user:', error)
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to create user', 500)
  }
}

/**
 * Get user by ID
 * GET /admin/users/{userId}
 */
export async function getUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const currentUser = getUserFromEvent(event)
    requireRole(currentUser, 'admin')
    
    const userId = event.pathParameters?.userId
    if (!userId) {
      return errorResponse('VALIDATION_ERROR', 'User ID is required', 400)
    }
    
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    }))
    
    if (!result.Item) {
      return errorResponse('NOT_FOUND', 'User not found', 404)
    }
    
    const { PK, SK, ...user } = result.Item
    return successResponse(user)
  } catch (error: any) {
    console.error('Error getting user:', error)
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to get user', 500)
  }
}

/**
 * List all users
 * GET /admin/users
 */
export async function listUsers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const currentUser = getUserFromEvent(event)
    requireRole(currentUser, 'admin')
    
    const result = await docClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': 'USER#',
        ':sk': 'METADATA',
      },
    }))
    
    const users = (result.Items || []).map((item: any) => {
      const { PK, SK, ...user } = item
      return user
    })
    
    return successResponse(users)
  } catch (error: any) {
    console.error('Error listing users:', error)
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to list users', 500)
  }
}

/**
 * Update user
 * PUT /admin/users/{userId}
 */
export async function updateUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const currentUser = getUserFromEvent(event)
    requireRole(currentUser, 'admin')
    
    const userId = event.pathParameters?.userId
    if (!userId) {
      return errorResponse('VALIDATION_ERROR', 'User ID is required', 400)
    }
    
    const body = JSON.parse(event.body || '{}')
    const { role, assignedIndustries } = body
    
    // Update Cognito
    await updateCognitoUser(userId, role, assignedIndustries)
    
    // Update DynamoDB
    const updateExpressions: string[] = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, any> = {}
    
    if (role) {
      updateExpressions.push('#role = :role')
      expressionAttributeNames['#role'] = 'role'
      expressionAttributeValues[':role'] = role
    }
    
    if (assignedIndustries !== undefined) {
      updateExpressions.push('#assignedIndustries = :assignedIndustries')
      expressionAttributeNames['#assignedIndustries'] = 'assignedIndustries'
      expressionAttributeValues[':assignedIndustries'] = assignedIndustries
    }
    
    updateExpressions.push('#updatedAt = :updatedAt')
    expressionAttributeNames['#updatedAt'] = 'updatedAt'
    expressionAttributeValues[':updatedAt'] = new Date().toISOString()
    
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
        userId,
        role,
        assignedIndustries,
        updatedAt: new Date().toISOString(),
      },
    }))
    
    // Get updated user
    const result = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    }))
    
    const { PK, SK, ...user } = result.Item || {}
    return successResponse(user)
  } catch (error: any) {
    console.error('Error updating user:', error)
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to update user', 500)
  }
}

/**
 * Delete user
 * DELETE /admin/users/{userId}
 */
export async function deleteUser(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const currentUser = getUserFromEvent(event)
    requireRole(currentUser, 'admin')
    
    const userId = event.pathParameters?.userId
    if (!userId) {
      return errorResponse('VALIDATION_ERROR', 'User ID is required', 400)
    }
    
    // Delete from Cognito
    await deleteCognitoUser(userId)
    
    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    }))
    
    return successResponse({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to delete user', 500)
  }
}

/**
 * Lambda handler - routes requests to appropriate function
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod
  const path = event.resource || event.path

  try {
    // GET /admin/users
    if (method === 'GET' && (path === '/admin/users' || path === '/admin/users/')) {
      return await listUsers(event)
    }

    // GET /admin/users/{userId}
    if (method === 'GET' && path.match(/\/admin\/users\/[^/]+$/)) {
      return await getUser(event)
    }

    // POST /admin/users
    if (method === 'POST' && (path === '/admin/users' || path === '/admin/users/')) {
      return await createUser(event)
    }

    // PUT /admin/users/{userId}
    if (method === 'PUT' && path.match(/\/admin\/users\/[^/]+$/)) {
      return await updateUser(event)
    }

    // DELETE /admin/users/{userId}
    if (method === 'DELETE' && path.match(/\/admin\/users\/[^/]+$/)) {
      return await deleteUser(event)
    }

    return errorResponse('NOT_FOUND', '接口不存在', 404)
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return errorResponse('INTERNAL_ERROR', '服务器内部错误', 500)
  }
}
