import { api } from './api'
import { SubIndustry } from '../types'

export interface CreateSubIndustryRequest {
  industryId: string
  name: string
  definition: string
  definitionCn?: string
  typicalGlobalCompanies?: string[]
  typicalChineseCompanies?: string[]
}

export interface UpdateSubIndustryRequest {
  name?: string
  definition?: string
  definitionCn?: string
  typicalGlobalCompanies?: string[]
  typicalChineseCompanies?: string[]
}

export interface MoveSubIndustryRequest {
  newIndustryId: string
}

export const subIndustryService = {
  listAll: () => api.get<SubIndustry[]>('/admin/sub-industries'),

  listByIndustry: (industryId: string) => api.get<SubIndustry[]>(`/admin/industries/${industryId}/sub-industries`),

  create: (data: CreateSubIndustryRequest) => api.post<SubIndustry>('/admin/sub-industries', data),

  update: (id: string, data: UpdateSubIndustryRequest) => api.put<SubIndustry>(`/admin/sub-industries/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/admin/sub-industries/${id}`),

  move: (id: string, data: MoveSubIndustryRequest) => api.patch<SubIndustry>(`/admin/sub-industries/${id}/move`, data),
}
