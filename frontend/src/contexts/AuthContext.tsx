import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchAuthSession, signIn, signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: string | string[]) => boolean
  hasIndustryAccess: (industryId: string) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      const attributes = await fetchUserAttributes()
      await fetchAuthSession()
      
      // Extract user information from Cognito
      const userData: User = {
        userId: currentUser.userId,
        email: attributes.email || '',
        role: (attributes['custom:role'] as 'admin' | 'specialist' | 'user') || 'user',
        assignedIndustries: attributes['custom:assignedIndustries'] 
          ? JSON.parse(attributes['custom:assignedIndustries']) 
          : undefined,
      }
      
      setUser(userData)
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await signIn({ username: email, password })
      await loadUser()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false
    if (Array.isArray(role)) {
      return role.includes(user.role)
    }
    return user.role === role
  }

  const hasIndustryAccess = (industryId: string): boolean => {
    if (!user) return false
    // Admin has access to all industries
    if (user.role === 'admin') return true
    // Specialist has access to assigned industries
    if (user.role === 'specialist' && user.assignedIndustries) {
      return user.assignedIndustries.includes(industryId)
    }
    return false
  }

  const refreshUser = async () => {
    await loadUser()
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    hasIndustryAccess,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
