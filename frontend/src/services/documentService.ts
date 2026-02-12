import { api } from './api'

export interface DocumentDownloadResponse {
  url: string
  expiresIn: number
  documentId: string
}

export const documentService = {
  getDownloadUrl: (documentId: string, s3Key: string) =>
    api.get<DocumentDownloadResponse>(`/public/documents/${documentId}/download?s3Key=${encodeURIComponent(s3Key)}`),
}
