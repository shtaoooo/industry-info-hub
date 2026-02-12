/**
 * Error Handling Utilities
 * Provides centralized error handling and user-friendly error messages
 */

import { message as antdMessage } from 'antd'

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface ErrorResponse {
  error: ApiError
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Validation errors
  VALIDATION_ERROR: '输入数据验证失败',
  INVALID_FORMAT: '数据格式不正确',
  MISSING_REQUIRED_FIELD: '缺少必填字段',
  
  // Authentication/Authorization errors
  UNAUTHORIZED: '未授权访问，请先登录',
  FORBIDDEN: '权限不足，无法执行此操作',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  INVALID_CREDENTIALS: '用户名或密码错误',
  
  // Resource errors
  NOT_FOUND: '请求的资源不存在',
  ALREADY_EXISTS: '资源已存在',
  
  // Conflict errors
  CONFLICT: '操作冲突，请刷新后重试',
  CONCURRENT_MODIFICATION: '数据已被其他用户修改，请刷新后重试',
  REFERENTIAL_INTEGRITY: '存在关联数据，无法删除',
  
  // Server errors
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
  TIMEOUT: '请求超时，请检查网络连接',
  
  // Network errors
  NETWORK_ERROR: '网络连接失败，请检查网络',
  
  // Default
  UNKNOWN_ERROR: '未知错误，请联系管理员',
}

/**
 * Parse error from API response
 */
export function parseApiError(error: any): ApiError {
  // If it's already an ApiError
  if (error?.code && error?.message) {
    return error as ApiError
  }
  
  // If it's an Error object with message
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    }
  }
  
  // If it's a response with error property
  if (error?.error) {
    return error.error as ApiError
  }
  
  // Default error
  return {
    code: 'UNKNOWN_ERROR',
    message: '发生未知错误',
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: ApiError): string {
  // Use predefined message if available
  if (ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code]
  }
  
  // Use error message from API
  if (error.message) {
    return error.message
  }
  
  // Fallback to unknown error
  return ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Display error message to user
 */
export function showError(error: any, customMessage?: string): void {
  const apiError = parseApiError(error)
  const message = customMessage || getUserFriendlyMessage(apiError)
  
  antdMessage.error(message)
  
  // Log error for debugging
  console.error('Error:', {
    code: apiError.code,
    message: apiError.message,
    details: apiError.details,
    original: error,
  })
}

/**
 * Display success message to user
 */
export function showSuccess(message: string): void {
  antdMessage.success(message)
}

/**
 * Display warning message to user
 */
export function showWarning(message: string): void {
  antdMessage.warning(message)
}

/**
 * Display info message to user
 */
export function showInfo(message: string): void {
  antdMessage.info(message)
}

/**
 * Handle API errors with automatic message display
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  options?: {
    successMessage?: string
    errorMessage?: string
    showLoading?: boolean
  }
): Promise<T | null> {
  let hideLoading: (() => void) | null = null
  
  try {
    if (options?.showLoading) {
      hideLoading = antdMessage.loading('处理中...', 0)
    }
    
    const result = await apiCall()
    
    if (hideLoading) {
      hideLoading()
    }
    
    if (options?.successMessage) {
      showSuccess(options.successMessage)
    }
    
    return result
  } catch (error) {
    if (hideLoading) {
      hideLoading()
    }
    
    showError(error, options?.errorMessage)
    return null
  }
}

/**
 * Error boundary helper for React components
 */
export function getErrorSuggestion(error: ApiError): string | null {
  const suggestions: Record<string, string> = {
    VALIDATION_ERROR: '请检查输入的数据是否符合要求',
    UNAUTHORIZED: '请尝试重新登录',
    FORBIDDEN: '请联系管理员获取相应权限',
    NOT_FOUND: '请确认资源是否存在',
    CONFLICT: '请刷新页面后重试',
    CONCURRENT_MODIFICATION: '请刷新页面获取最新数据',
    REFERENTIAL_INTEGRITY: '请先删除关联的数据',
    NETWORK_ERROR: '请检查网络连接是否正常',
    TIMEOUT: '请检查网络连接或稍后重试',
    INTERNAL_ERROR: '请稍后重试，如果问题持续请联系管理员',
  }
  
  return suggestions[error.code] || null
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: any): {
  title: string
  message: string
  suggestion?: string
} {
  const apiError = parseApiError(error)
  const message = getUserFriendlyMessage(apiError)
  const suggestion = getErrorSuggestion(apiError)
  
  return {
    title: '操作失败',
    message,
    suggestion: suggestion || undefined,
  }
}

/**
 * Check if error is a specific type
 */
export function isErrorType(error: any, code: string): boolean {
  const apiError = parseApiError(error)
  return apiError.code === code
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  return isErrorType(error, 'VALIDATION_ERROR')
}

/**
 * Check if error is an authorization error
 */
export function isAuthError(error: any): boolean {
  return isErrorType(error, 'UNAUTHORIZED') || isErrorType(error, 'FORBIDDEN')
}

/**
 * Check if error is a conflict error
 */
export function isConflictError(error: any): boolean {
  return isErrorType(error, 'CONFLICT') || isErrorType(error, 'CONCURRENT_MODIFICATION')
}

/**
 * Retry helper for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry on validation or auth errors
      if (isValidationError(error) || isAuthError(error)) {
        throw error
      }
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
      }
    }
  }
  
  throw lastError
}
