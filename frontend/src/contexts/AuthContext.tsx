import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchAuthSession, signIn, signOut, getCurrentUser, fetchUserAttributes, confirmSignIn } from 'aws-amplify/auth'
import { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  needsNewPassword: boolean
  currentRole: 'admin' | 'specialist' | 'user' | null
  login: (email: string, password: string) => Promise<void>
  confirmNewPassword: (newPassword: string) => Promise<void>
  logout: () => Promise<void>
  switchRole: (role: 'admin' | 'specialist' | 'user') => void
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
  const [currentRole, setCurrentRole] = useState<'admin' | 'specialist' | 'user' | null>(null)

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

      // Parse roles safely - support both single role and multiple roles
      let roles: ('admin' | 'specialist' | 'user')[] = []
      const singleRole = (attributes['custom:role'] as 'admin' | 'specialist' | 'user') || 'user'
      
      try {
        const rolesRaw = attributes['custom:roles']
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

      // Extract user information from Cognito
      const userData: User = {
        userId: currentUser.userId,
        email: attributes.email || '',
        role: singleRole, // 保留用于向后兼容
        roles: roles,
        assignedIndustries,
      }
      
      console.log('User loaded:', userData.email, 'roles:', userData.roles)
      setUser(userData)
      
      // Set current role from localStorage or default to first role
      const savedRole = localStorage.getItem('currentRole') as 'admin' | 'specialist' | 'user' | null
      if (savedRole && roles.includes(savedRole)) {
        setCurrentRole(savedRole)
      } else {
        setCurrentRole(roles[0] || 'user')
      }
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
      setCurrentRole(null)
      localStorage.removeItem('currentRole')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const switchRole = (role: 'admin' | 'specialist' | 'user') => {
    if (user && user.roles.includes(role)) {
      setCurrentRole(role)
      localStorage.setItem('currentRole', role)
    }
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!user || !currentRole) return false
    if (Array.isArray(role)) {
      return role.includes(currentRole)
    }
    return currentRole === role
  }

  const hasIndustryAccess = (industryId: string): boolean => {
    if (!user || !currentRole) return false
    // Admin has access to all industries
    if (currentRole === 'admin') return true
    // Specialist has access to assigned industries
    if (currentRole === 'specialist' && user.assignedIndustries) {
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
    currentRole,
    login,
    confirmNewPassword,
    logout,
    switchRole,
    hasRole,
    hasIndustryAccess,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
