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
    const { email, role, roles, assignedIndustries } = body
    
    if (!email) {
      return errorResponse('VALIDATION_ERROR', 'Email is required', 400)
    }
    
    // Support both single role and multiple roles
    let userRoles: ('admin' | 'specialist' | 'user')[] = []
    if (roles && Array.isArray(roles) && roles.length > 0) {
      userRoles = roles
    } else if (role) {
      userRoles = [role]
    } else {
      return errorResponse('VALIDATION_ERROR', 'Role or roles are required', 400)
    }
    
    // Validate all roles
    for (const r of userRoles) {
      if (!['admin', 'specialist', 'user'].includes(r)) {
        return errorResponse('VALIDATION_ERROR', `Invalid role: ${r}`, 400)
      }
    }
    
    // Primary role is the first one
    const primaryRole = userRoles[0]
    
    // Create user in Cognito
    const cognitoResponse = await createCognitoUser(email, primaryRole, assignedIndustries, userRoles)
    const userId = cognitoResponse.User?.Username || ''
    
    // Store user metadata in DynamoDB
    const user: User = {
      userId,
      email,
      role: primaryRole,
      roles: userRoles,
      assignedIndustries: userRoles.includes('specialist') ? assignedIndustries : undefined,
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
    const { role, roles, assignedIndustries } = body
    
    // Support both single role and multiple roles
    let userRoles: ('admin' | 'specialist' | 'user')[] | undefined
    if (roles && Array.isArray(roles) && roles.length > 0) {
      userRoles = roles
      // Validate all roles
      for (const r of userRoles) {
        if (!['admin', 'specialist', 'user'].includes(r)) {
          return errorResponse('VALIDATION_ERROR', `Invalid role: ${r}`, 400)
        }
      }
    } else if (role) {
      if (!['admin', 'specialist', 'user'].includes(role)) {
        return errorResponse('VALIDATION_ERROR', 'Invalid role', 400)
      }
      userRoles = [role]
    }
    
    // Primary role is the first one
    const primaryRole = userRoles ? userRoles[0] : undefined
    
    // Update Cognito
    await updateCognitoUser(userId, primaryRole, assignedIndustries, userRoles)
    
    // Update DynamoDB
    const updateData: any = {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      userId,
      updatedAt: new Date().toISOString(),
    }
    
    if (primaryRole) {
      updateData.role = primaryRole
    }
    
    if (userRoles) {
      updateData.roles = userRoles
    }
    
    if (assignedIndustries !== undefined) {
      updateData.assignedIndustries = assignedIndustries
    }
    
    // Get existing user data first
    const existingResult = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    }))
    
    // Merge with existing data
    const mergedData = {
      ...existingResult.Item,
      ...updateData,
    }
    
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: mergedData,
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
export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.resource || event.rawPath || event.path

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
