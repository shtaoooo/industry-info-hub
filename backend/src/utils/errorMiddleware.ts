/**
 * Error Handling Middleware
 * Provides centralized error handling for Lambda functions
 */

import { APIGatewayProxyResult } from 'aws-lambda'
import { errorResponse } from './response'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Common error types
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super('NOT_FOUND', message, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super('FORBIDDEN', message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super('CONFLICT', message, 409, details)
  }
}

export class InternalError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super('INTERNAL_ERROR', message, 500)
  }
}

/**
 * Error handler wrapper for Lambda functions
 */
export function withErrorHandler(
  handler: (...args: any[]) => Promise<APIGatewayProxyResult>
) {
  return async (...args: any[]): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Handle errors and return appropriate response
 */
export function handleError(error: any): APIGatewayProxyResult {
  console.error('Error occurred:', error)
  
  // Handle AppError instances
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.statusCode, error.details)
  }
  
  // Handle DynamoDB ConditionalCheckFailedException
  if (error.name === 'ConditionalCheckFailedException') {
    return errorResponse(
      'CONCURRENT_MODIFICATION',
      '数据已被其他用户修改，请刷新后重试',
      409
    )
  }
  
  // Handle DynamoDB TransactionCanceledException
  if (error.name === 'TransactionCanceledException') {
    return errorResponse(
      'CONFLICT',
      '操作冲突，请重试',
      409,
      { reasons: error.CancellationReasons }
    )
  }
  
  // Handle permission errors
  if (error.message === 'Insufficient permissions') {
    return errorResponse('FORBIDDEN', '权限不足', 403)
  }
  
  if (error.message === 'No access to this industry') {
    return errorResponse('FORBIDDEN', '无权访问此行业', 403)
  }
  
  // Handle not found errors
  if (error.message === 'Item not found') {
    return errorResponse('NOT_FOUND', '资源不存在', 404)
  }
  
  // Handle AWS SDK errors
  if (error.name && error.name.includes('Exception')) {
    return errorResponse(
      'INTERNAL_ERROR',
      '服务暂时不可用，请稍后重试',
      500,
      { awsError: error.name }
    )
  }
  
  // Default error
  return errorResponse(
    'INTERNAL_ERROR',
    error.message || '服务器内部错误',
    500
  )
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields: string[] = []
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    throw new ValidationError(
      `缺少必填字段: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }
}

/**
 * Validate field length
 */
export function validateLength(
  value: string,
  fieldName: string,
  min?: number,
  max?: number
): void {
  if (!value) {
    throw new ValidationError(`${fieldName}不能为空`)
  }
  
  const length = value.trim().length
  
  if (min !== undefined && length < min) {
    throw new ValidationError(`${fieldName}长度不能少于${min}个字符`)
  }
  
  if (max !== undefined && length > max) {
    throw new ValidationError(`${fieldName}长度不能超过${max}个字符`)
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('邮箱格式不正确')
  }
}

/**
 * Assert condition or throw error
 */
export function assert(condition: boolean, message: string, ErrorClass = AppError): void {
  if (!condition) {
    throw new ErrorClass('ASSERTION_FAILED', message)
  }
}

/**
 * Try-catch wrapper with error transformation
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new InternalError(errorMessage || '操作失败')
  }
}
