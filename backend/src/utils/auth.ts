import { APIGatewayProxyEvent } from 'aws-lambda'
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminListGroupsForUserCommand } from '@aws-sdk/client-cognito-identity-provider'

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' })
const USER_POOL_ID = process.env.USER_POOL_ID || ''

export interface AuthUser {
  userId: string
  email: string
  role: 'admin' | 'specialist' | 'user' // 主要角色，用于向后兼容
  roles: ('admin' | 'specialist' | 'user')[] // 所有角色
  assignedIndustries?: string[]
}

/**
 * Extract user information from API Gateway event
 * Assumes Cognito authorizer is configured
 */
export function getUserFromEvent(event: APIGatewayProxyEvent): AuthUser | null {
  try {
    // Support both REST API v1 (authorizer.claims) and HTTP API v2 (authorizer.jwt.claims)
    const authorizer = event.requestContext.authorizer as any
    const claims = authorizer?.claims || authorizer?.jwt?.claims
    if (!claims) {
      console.error('No claims found in authorizer. Authorizer context:', JSON.stringify(authorizer))
      return null
    }

    const userId = claims.sub
    const email = claims.email
    const singleRole = claims['custom:role'] || 'user'
    
    // Parse roles - support both single role and multiple roles
    let roles: ('admin' | 'specialist' | 'user')[] = []
    try {
      const rolesRaw = claims['custom:roles']
      if (rolesRaw) {
        roles = JSON.parse(rolesRaw)
      } else {
        // Fallback to single role for backward compatibility
        roles = [singleRole]
      }
    } catch {
      console.warn('Failed to parse roles, using single role')
      roles = [singleRole]
    }
    
    const assignedIndustries = claims['custom:assignedIndustries'] 
      ? JSON.parse(claims['custom:assignedIndustries']) 
      : undefined

    return {
      userId,
      email,
      role: singleRole, // 保留用于向后兼容
      roles,
      assignedIndustries,
    }
  } catch (error) {
    console.error('Error extracting user from event:', error)
    return null
  }
}

/**
 * Check if user has required role
 * Checks against all roles the user has
 */
export function hasRole(user: AuthUser | null, requiredRole: string | string[]): boolean {
  if (!user) return false
  
  if (Array.isArray(requiredRole)) {
    // Check if user has any of the required roles
    return requiredRole.some(role => user.roles.includes(role as any))
  }
  
  // Check if user has the specific role
  return user.roles.includes(requiredRole as any)
}

/**
 * Check if user has access to specific industry
 * Admin has access to all industries
 * Specialist has access to assigned industries only
 */
export function hasIndustryAccess(user: AuthUser | null, industryId: string): boolean {
  if (!user) return false
  
  // Admin has access to all industries
  if (user.roles.includes('admin')) return true
  
  // Specialist has access to assigned industries
  if (user.roles.includes('specialist') && user.assignedIndustries) {
    return user.assignedIndustries.includes(industryId)
  }
  
  return false
}

/**
 * Verify user has required role, throw error if not
 */
export function requireRole(user: AuthUser | null, requiredRole: string | string[]): void {
  if (!hasRole(user, requiredRole)) {
    throw new Error('Insufficient permissions')
  }
}

/**
 * Verify user has industry access, throw error if not
 */
export function requireIndustryAccess(user: AuthUser | null, industryId: string): void {
  if (!hasIndustryAccess(user, industryId)) {
    throw new Error('No access to this industry')
  }
}

/**
 * Get user details from Cognito
 */
export async function getCognitoUser(userId: string) {
  const command = new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
  })
  
  return await cognitoClient.send(command)
}

/**
 * Create a new Cognito user
 */
export async function createCognitoUser(
  email: string,
  role: 'admin' | 'specialist' | 'user',
  assignedIndustries?: string[],
  roles?: ('admin' | 'specialist' | 'user')[]
) {
  const attributes = [
    { Name: 'email', Value: email },
    { Name: 'email_verified', Value: 'true' },
    { Name: 'custom:role', Value: role },
  ]
  
  // Add roles array if provided, otherwise use single role
  if (roles && roles.length > 0) {
    attributes.push({
      Name: 'custom:roles',
      Value: JSON.stringify(roles),
    })
  } else {
    attributes.push({
      Name: 'custom:roles',
      Value: JSON.stringify([role]),
    })
  }
  
  if (assignedIndustries && assignedIndustries.length > 0) {
    attributes.push({
      Name: 'custom:assignedIndustries',
      Value: JSON.stringify(assignedIndustries),
    })
  }
  
  const command = new AdminCreateUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    UserAttributes: attributes,
    DesiredDeliveryMediums: ['EMAIL'],
  })
  
  return await cognitoClient.send(command)
}

/**
 * Update user attributes in Cognito
 */
export async function updateCognitoUser(
  userId: string,
  role?: 'admin' | 'specialist' | 'user',
  assignedIndustries?: string[],
  roles?: ('admin' | 'specialist' | 'user')[]
) {
  const attributes = []
  
  if (role) {
    attributes.push({ Name: 'custom:role', Value: role })
  }
  
  // Update roles array
  if (roles && roles.length > 0) {
    attributes.push({
      Name: 'custom:roles',
      Value: JSON.stringify(roles),
    })
  } else if (role) {
    // If only single role provided, create roles array from it
    attributes.push({
      Name: 'custom:roles',
      Value: JSON.stringify([role]),
    })
  }
  
  if (assignedIndustries !== undefined) {
    attributes.push({
      Name: 'custom:assignedIndustries',
      Value: JSON.stringify(assignedIndustries),
    })
  }
  
  if (attributes.length === 0) {
    return
  }
  
  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
    UserAttributes: attributes,
  })
  
  return await cognitoClient.send(command)
}

/**
 * Delete user from Cognito
 */
export async function deleteCognitoUser(userId: string) {
  const command = new AdminDeleteUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
  })
  
  return await cognitoClient.send(command)
}
