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
  createdAt: string
  updatedAt: string
}

export interface UseCase {
  id: string
  subIndustryId: string
  industryId: string
  name: string
  description: string
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
  targetCustomers?: string
  solutionContent?: string
  solutionSource?: string
  awsServices?: string
  whyAws?: string
  promotionKeyPoints?: string
  faq?: string
  keyTerms?: string
  successCases?: string
  documents: Document[]
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
