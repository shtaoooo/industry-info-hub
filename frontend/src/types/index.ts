// Common Types for Industry Portal Frontend

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
  businessScenario?: string // 业务场景
  customerPainPoints?: string // 客户痛点
  targetAudience?: string // 切入人群
  communicationScript?: string // 沟通话术
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
  solutionId: string
  useCaseId: string
  name: string
  description: string
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
  role: 'admin' | 'specialist' | 'user'
  assignedIndustries?: string[]
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
