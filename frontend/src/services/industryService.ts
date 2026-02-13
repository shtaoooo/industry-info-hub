import { api } from './api'
import { Industry } from '../types'

export interface CreateIndustryRequest {
  name: string
  definition: string
  definitionCn?: string
}

export interface UpdateIndustryRequest {
  name?: string
  definition?: string
  definitionCn?: string
}

export interface CSVImportResult {
  successCount: number
  skipCount: number
  errorCount: number
  errors: string[]
}

export const industryService = {
  list: () => api.get<Industry[]>('/admin/industries'),

  create: (data: CreateIndustryRequest) => api.post<Industry>('/admin/industries', data),

  update: (id: string, data: UpdateIndustryRequest) => api.put<Industry>(`/admin/industries/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/admin/industries/${id}`),

  setVisibility: (id: string, isVisible: boolean) =>
    api.patch<Industry>(`/admin/industries/${id}/visibility`, { isVisible }),

  importCSV: (csvContent: string) =>
    api.post<CSVImportResult>('/admin/industries/import-csv', { csvContent }),
}
