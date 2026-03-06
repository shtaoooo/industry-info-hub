import { api } from './api'
import { CustomerCase, Document } from '../types'

export interface CreateCustomerCaseRequest {
  name: string
  accountId?: string
  partner?: string
  useCaseIds?: string[]
  industryId?: string | null
  summary?: string
  detailMarkdown?: string
}

export interface UpdateCustomerCaseRequest {
  name?: string
  accountId?: string
  partner?: string
  useCaseIds?: string[]
  industryId?: string | null
  summary?: string
  detailMarkdown?: string
}

export interface UploadDocumentRequest {
  fileName: string
  fileContent: string // base64 encoded
  contentType?: string
}

export interface Account {
  id: string
  name: string
  type: string
  description?: string
  createdAt: string
}

export const customerCaseService = {
  list: () => api.get<CustomerCase[]>('/specialist/customer-cases'),

  create: (data: CreateCustomerCaseRequest) => api.post<CustomerCase>('/specialist/customer-cases', data),

  update: (id: string, data: UpdateCustomerCaseRequest) =>
    api.put<CustomerCase>(`/specialist/customer-cases/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/specialist/customer-cases/${id}`),

  uploadDocument: (id: string, data: UploadDocumentRequest) =>
    api.post<{ document: Document; message: string }>(`/specialist/customer-cases/${id}/documents`, data),
}

export const accountService = {
  list: () => api.get<Account[]>('/specialist/accounts'),
  create: (data: { name: string; type: string }) => api.post<Account>('/specialist/accounts', data),
}
