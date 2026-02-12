import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchAuthSession, signIn, signOut, getCurrentUser, fetchUserAttributes, confirmSignIn } from 'aws-amplify/auth'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  needsNewPassword: boolean
  login: (email: string, password: string) => Promise<void>
  confirmNewPassword: (newPassword: string) => Promise<void>
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
  const [needsNewPassword, setNeedsNewPassword] = useState(false)

  const loadUser = async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      const attributes = await fetchUserAttributes()
      await fetchAuthSession()
      
      // Parse assignedIndustries safely
      let assignedIndustries: string[] | undefined
      try {
        const raw = attributes['custom:assignedIndustries']
        if (raw) {
          assignedIndustries = JSON.parse(raw)
        }
      } catch {
        console.warn('Failed to parse assignedIndustries, ignoring')
      }

      // Extract user information from Cognito
      const userData: User = {
        userId: currentUser.userId,
        email: attributes.email || '',
        role: (attributes['custom:role'] as 'admin' | 'specialist' | 'user') || 'user',
        assignedIndustries,
      }
      
      console.log('User loaded:', userData.email, 'role:', userData.role)
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
      const result = await signIn({ username: email, password })
      console.log('SignIn result:', JSON.stringify(result))
      
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true)
        return
      }
      
      if (result.isSignedIn) {
        await loadUser()
      } else {
        throw new Error(`登录未完成，状态: ${result.nextStep?.signInStep}`)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const confirmNewPassword = async (newPassword: string) => {
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword })
      console.log('ConfirmSignIn result:', JSON.stringify(result))
      
      if (result.isSignedIn) {
        setNeedsNewPassword(false)
        await loadUser()
      } else {
        throw new Error(`设置密码未完成，状态: ${result.nextStep?.signInStep}`)
      }
    } catch (error) {
      console.error('Confirm new password error:', error)
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
    needsNewPassword,
    login,
    confirmNewPassword,
    logout,
    hasRole,
    hasIndustryAccess,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
