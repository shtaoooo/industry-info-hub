import { api } from './api'

export interface MappedSolution {
  id: string
  name: string
  description: string
  detailMarkdownUrl?: string
  createdAt: string
  mappedAt: string
}

export interface MappedUseCase {
  id: string
  name: string
  description: string
  subIndustryId: string
  industryId: string
  createdAt: string
  mappedAt: string
}

export const mappingService = {
  createMapping: (useCaseId: string, solutionId: string) =>
    api.post<{ useCaseId: string; solutionId: string; createdAt: string }>(
      `/specialist/use-cases/${useCaseId}/solutions/${solutionId}`,
      {}
    ),

  deleteMapping: (useCaseId: string, solutionId: string) =>
    api.delete<{ message: string }>(`/specialist/use-cases/${useCaseId}/solutions/${solutionId}`),

  getSolutionsForUseCase: (useCaseId: string) =>
    api.get<MappedSolution[]>(`/specialist/use-cases/${useCaseId}/solutions`),

  getUseCasesForSolution: (solutionId: string) =>
    api.get<MappedUseCase[]>(`/specialist/solutions/${solutionId}/use-cases`),
}
