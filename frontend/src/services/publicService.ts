import { api } from './api'

export interface PublicIndustry {
  id: string
  name: string
  definition: string
  definitionCn?: string
  imageUrl?: string
  icon?: string
  createdAt: string
}

export interface PublicSubIndustry {
  id: string
  industryId: string
  name: string
  definition: string
  definitionCn?: string
  typicalGlobalCompanies: string[]
  typicalChineseCompanies: string[]
  priority?: number
  level?: string
  parentSubIndustryId?: string
  childrenIds?: string[]
  createdAt: string
}

export interface PublicUseCase {
  id: string
  subIndustryId: string
  industryId: string
  name: string
  description: string
  businessScenario?: string
  customerPainPoints?: string
  targetAudience?: string
  communicationScript?: string
  recommendationScore?: number
  documents?: any[]
  createdAt: string
}

export interface PublicSolution {
  id: string
  name: string
  description: string
  detailMarkdownUrl?: string
  createdAt: string
}

export interface PublicCustomerCase {
  id: string
  name: string
  accountId?: string
  partner?: string
  useCaseIds?: string[]
  summary?: string
  detailMarkdownUrl?: string
  documents?: any[]
  createdAt: string
  account?: PublicAccount | null
}

export interface PublicAccount {
  id: string
  name: string
  type: string
  description?: string
  logoUrl?: string
  website?: string
}

export interface PublicNews {
  id: string
  industryId: string
  title: string
  summary: string
  content?: string
  imageUrl?: string
  externalUrl?: string
  author: string
  publishedAt: string
}

export interface PublicBlog {
  id: string
  industryId: string
  useCaseIds?: string[]
  title: string
  summary: string
  content?: string
  imageUrl?: string
  externalUrl?: string
  author: string
  publishedAt: string
}

export const publicService = {
  // Industries
  listIndustries: () => api.get<PublicIndustry[]>('/public/industries'),
  
  getIndustry: (id: string) => api.get<PublicIndustry>(`/public/industries/${id}`),
  
  listSubIndustries: (industryId: string) =>
    api.get<PublicSubIndustry[]>(`/public/industries/${industryId}/sub-industries`),

  getIndustryNews: (industryId: string, limit?: number) =>
    api.get<PublicNews[]>(`/public/industries/${industryId}/news${limit ? `?limit=${limit}` : ''}`),

  getIndustryBlogs: (industryId: string, limit?: number) =>
    api.get<PublicBlog[]>(`/public/industries/${industryId}/blogs${limit ? `?limit=${limit}` : ''}`),

  getIndustryCustomerCases: (industryId: string) =>
    api.get<PublicCustomerCase[]>(`/public/industries/${industryId}/customer-cases`),

  // News and Blogs
  getNews: (id: string) => api.get<PublicNews>(`/public/news/${id}`),

  getBlog: (id: string) => api.get<PublicBlog>(`/public/blogs/${id}`),

  // Use Cases
  listUseCases: (subIndustryId: string) =>
    api.get<{ subIndustry: PublicSubIndustry; useCases: PublicUseCase[] }>(
      `/public/sub-industries/${subIndustryId}/use-cases`
    ),
  
  getUseCase: (id: string) => api.get<PublicUseCase>(`/public/use-cases/${id}`),
  
  getSolutionsForUseCase: (useCaseId: string) =>
    api.get<PublicSolution[]>(`/public/use-cases/${useCaseId}/solutions`),

  getUseCaseBlogs: (useCaseId: string) =>
    api.get<PublicBlog[]>(`/public/use-cases/${useCaseId}/blogs`),

  getUseCaseCustomerCases: (useCaseId: string) =>
    api.get<PublicCustomerCase[]>(`/public/use-cases/${useCaseId}/customer-cases`),

  // Solutions
  getSolution: (id: string) => api.get<PublicSolution>(`/public/solutions/${id}`),
  
  getSolutionMarkdown: (id: string) => api.get<{ url: string }>(`/public/solutions/${id}/detail-markdown`),
  
  getCustomerCases: (solutionId: string) =>
    api.get<PublicCustomerCase[]>(`/public/solutions/${solutionId}/customer-cases`),

  getCustomerCase: (id: string) =>
    api.get<PublicCustomerCase>(`/public/customer-cases/${id}`),
}
