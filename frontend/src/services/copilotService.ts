import { api } from './api'

interface CopilotResponse {
  reply: string
}

export const copilotService = {
  chat: (message: string) => api.post<CopilotResponse>('/public/copilot/chat', { message }),
}
