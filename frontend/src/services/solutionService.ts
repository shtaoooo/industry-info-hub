import { api } from './api'
import { Solution } from '../types'

export interface CreateSolutionRequest {
  name: string
  description: string
  targetCustomers?: string
  solutionContent?: string
  solutionSource?: string
  awsServices?: string
  whyAws?: string
  promotionKeyPoints?: string
  faq?: string
  keyTerms?: string
  successCases?: string
}

export interface UpdateSolutionRequest {
  name?: string
  description?: string
  targetCustomers?: string
  solutionContent?: string
  solutionSource?: string
  awsServices?: string
  whyAws?: string
  promotionKeyPoints?: string
  faq?: string
  keyTerms?: string
  successCases?: string
}

export interface UploadMarkdownRequest {
  markdownContent: string
}

export interface MarkdownUrlResponse {
  url: string
  s3Url: string
}

export const solutionService = {
  list: () => api.get<Solution[]>('/admin/solutions'),

  get: (id: string) => api.get<Solution>(`/admin/solutions/${id}`),

  create: (data: CreateSolutionRequest) => api.post<Solution>('/admin/solutions', data),

  update: (id: string, data: UpdateSolutionRequest) => api.put<Solution>(`/admin/solutions/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/admin/solutions/${id}`),

  uploadMarkdown: (id: string, data: UploadMarkdownRequest) =>
    api.post<{ detailMarkdownUrl: string; message: string }>(`/admin/solutions/${id}/detail-markdown`, data),

  getMarkdownUrl: (id: string) => api.get<MarkdownUrlResponse>(`/admin/solutions/${id}/detail-markdown`),
}
