import { api } from './api'
import { UseCase, Document } from '../types'

export interface CreateUseCaseRequest {
  subIndustryId: string
  name: string
  description: string
}

export interface UpdateUseCaseRequest {
  name?: string
  description?: string
}

export interface UploadDocumentRequest {
  fileName: string
  fileContent: string // base64 encoded
  contentType?: string
}

export const useCaseService = {
  list: () => api.get<UseCase[]>('/specialist/use-cases'),

  create: (data: CreateUseCaseRequest) => api.post<UseCase>('/specialist/use-cases', data),

  update: (id: string, data: UpdateUseCaseRequest) => api.put<UseCase>(`/specialist/use-cases/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/specialist/use-cases/${id}`),

  uploadDocument: (id: string, data: UploadDocumentRequest) =>
    api.post<{ document: Document; message: string }>(`/specialist/use-cases/${id}/documents`, data),

  deleteDocument: (id: string, docId: string) =>
    api.delete<{ message: string }>(`/specialist/use-cases/${id}/documents/${docId}`),
}
