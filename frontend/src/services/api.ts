import { fetchAuthSession } from 'aws-amplify/auth'

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'https://api.example.com'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_ENDPOINT}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          'INTERNAL_ERROR',
          `服务器错误 (${response.status})`,
          response.status
        )
      }
      return {} as T
    }

    const data = await response.json()

    if (!response.ok) {
      const errorCode = data?.error?.code || 'UNKNOWN_ERROR'
      const errorMessage = data?.error?.message || `请求失败 (${response.status})`
      const errorDetails = data?.error?.details
      
      throw new ApiError(errorCode, errorMessage, response.status, errorDetails)
    }

    return data as T
  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('NETWORK_ERROR', '网络连接失败，请检查网络', 0)
    }
    
    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error
    }
    
    // Unknown errors
    throw new ApiError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : '未知错误',
      0
    )
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
