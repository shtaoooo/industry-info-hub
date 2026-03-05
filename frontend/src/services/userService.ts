import { api } from './api'
import { User } from '../types'

export interface CreateUserRequest {
  email: string
  role?: 'admin' | 'specialist' | 'user' // 单角色，用于向后兼容
  roles?: ('admin' | 'specialist' | 'user')[] // 多角色
  assignedIndustries?: string[]
}

export interface UpdateUserRequest {
  role?: 'admin' | 'specialist' | 'user' // 单角色，用于向后兼容
  roles?: ('admin' | 'specialist' | 'user')[] // 多角色
  assignedIndustries?: string[]
}

export const userService = {
  list: () => api.get<User[]>('/admin/users'),

  get: (userId: string) => api.get<User>(`/admin/users/${userId}`),

  create: (data: CreateUserRequest) => api.post<User>('/admin/users', data),

  update: (userId: string, data: UpdateUserRequest) => api.put<User>(`/admin/users/${userId}`, data),

  delete: (userId: string) => api.delete<{ message: string }>(`/admin/users/${userId}`),
}
