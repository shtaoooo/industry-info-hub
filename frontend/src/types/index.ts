// Common Types for Industry Portal Frontend

export interface Industry {
  id: string
  name: string
  definition: string
  isVisible: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface SubIndustry {
  id: string
  industryId: string
  name: string
  definition: string
  typicalGlobalCompanies: string[]
  typicalChineseCompanies: string[]
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
