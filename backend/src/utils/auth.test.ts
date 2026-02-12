import { describe, it, expect } from 'vitest'
import { hasRole, hasIndustryAccess, AuthUser } from './auth'

describe('Authentication Utilities', () => {
  describe('hasRole', () => {
    it('should return true when user has the required role', () => {
      const user: AuthUser = {
        userId: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
      }
      
      expect(hasRole(user, 'admin')).toBe(true)
    })
    
    it('should return false when user does not have the required role', () => {
      const user: AuthUser = {
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user',
      }
      
      expect(hasRole(user, 'admin')).toBe(false)
    })
    
    it('should return true when user has one of the required roles (array)', () => {
      const user: AuthUser = {
        userId: 'user-1',
        email: 'specialist@example.com',
        role: 'specialist',
      }
      
      expect(hasRole(user, ['admin', 'specialist'])).toBe(true)
    })
    
    it('should return false when user is null', () => {
      expect(hasRole(null, 'admin')).toBe(false)
    })
  })
  
  describe('hasIndustryAccess', () => {
    it('should return true for admin accessing any industry', () => {
      const admin: AuthUser = {
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      }
      
      expect(hasIndustryAccess(admin, 'industry-1')).toBe(true)
      expect(hasIndustryAccess(admin, 'industry-2')).toBe(true)
    })
    
    it('should return true for specialist accessing assigned industry', () => {
      const specialist: AuthUser = {
        userId: 'specialist-1',
        email: 'specialist@example.com',
        role: 'specialist',
        assignedIndustries: ['industry-1', 'industry-2'],
      }
      
      expect(hasIndustryAccess(specialist, 'industry-1')).toBe(true)
      expect(hasIndustryAccess(specialist, 'industry-2')).toBe(true)
    })
    
    it('should return false for specialist accessing non-assigned industry', () => {
      const specialist: AuthUser = {
        userId: 'specialist-1',
        email: 'specialist@example.com',
        role: 'specialist',
        assignedIndustries: ['industry-1'],
      }
      
      expect(hasIndustryAccess(specialist, 'industry-2')).toBe(false)
    })
    
    it('should return false for regular user', () => {
      const user: AuthUser = {
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user',
      }
      
      expect(hasIndustryAccess(user, 'industry-1')).toBe(false)
    })
    
    it('should return false when user is null', () => {
      expect(hasIndustryAccess(null, 'industry-1')).toBe(false)
    })
  })
})
