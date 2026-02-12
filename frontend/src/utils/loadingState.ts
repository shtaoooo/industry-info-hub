/**
 * Loading State Management
 * Provides utilities for managing loading states in components
 */

import { useState, useCallback } from 'react'

export interface LoadingState {
  loading: boolean
  error: Error | null
  data: any | null
}

/**
 * Hook for managing async operation state
 */
export function useAsyncOperation<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await operation()
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return {
    loading,
    error,
    data,
    execute,
    reset,
  }
}

/**
 * Hook for managing multiple loading states
 */
export function useLoadingStates() {
  const [states, setStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setStates(prev => ({ ...prev, [key]: loading }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return states[key] || false
  }, [states])

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some(loading => loading)
  }, [states])

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    states,
  }
}

/**
 * Debounce function for search/filter operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for frequent operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
