// Common Types for Industry Portal

export interface Industry {
  id: string
  name: string
  definition: string
  definitionCn?: string
  isVisible: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface SubIndustry {
  id: string
  industryId: string
  name: string
  definition: string
  definitionCn?: string
  typicalGlobalCompanies: string[]
  typicalChineseCompanies: string[]
  priority?: number
  level?: string // 'Tier2-individual' | 'Tier2-Group' | 'Tier3'
  parentSubIndustryId?: string // For Tier3, reference to parent Tier2 (also called parentId)
  childrenIds?: string[] // For Tier2-Group, array of Tier3 sub-industry IDs
  createdAt: string
  updatedAt: string
}

export interface UseCase {
  id: string
  subIndustryId: string
  industryId: string
  name: string
  description: string // 保留用于向后兼容
  summary?: string // 简要描述
  recommendationScore?: number // 推荐指数 (1-5)
  documents: Document[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Solution {
  id: string
  name: string
  description: string
  detailMarkdownUrl?: string
  documents: Document[]
  createdBy: string
  industryIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CustomerCase {
  id: string
  name: string
  accountId?: string // 客户（从account表选择）
  partner?: string // 合作伙伴
  useCaseIds?: string[] // 关联的use case IDs（支持多个）
  challenge?: string // 业务挑战
  solution?: string // 解决方案描述
  benefit?: string // 收益
  documents: Document[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Document {
  id: string
  name: string
  s3Key: string
  uploadedAt: string
}

export interface User {
  userId: string
  email: string
  role: 'admin' | 'specialist' | 'user' // 主要角色，用于向后兼容
  roles?: ('admin' | 'specialist' | 'user')[] // 所有角色
  assignedIndustries?: string[]
  createdAt: string
  updatedAt: string
}

export interface UseCaseSolutionMapping {
  useCaseId: string
  solutionId: string
  createdAt: string
}

export interface CSVImportResult {
  successCount: number
  skipCount: number
  errorCount: number
  errors: string[]
}

export interface News {
  id: string
  industryId: string
  title: string
  summary: string
  content: string
  imageUrl?: string
  externalUrl?: string
  author: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface Blog {
  id: string
  industryId: string
  useCaseIds?: string[] // 关联的use case IDs（支持多个）
  title: string
  summary: string
  content: string
  imageUrl?: string
  externalUrl?: string
  author: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  name: string
  type: 'customer' | 'partner' | 'vendor'
  description?: string
  logoUrl?: string
  website?: string
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  normalizedName: string
  type: 'chinese' | 'global'
  createdAt: string
  updatedAt: string
}
