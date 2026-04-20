import { authenticatedFetch } from '@/lib/auth-client'

export type AssistantResponseType = 'normal' | 'alert'
export type AssistantConfidence = 'low' | 'medium' | 'high'
export type AssistantUrgency = 'high'

export interface ChatMessageRecord {
  id: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface AssistantQueryResponse {
  type: AssistantResponseType
  response: string
  disclaimer: string
  confidence: AssistantConfidence
  message?: string
  urgency?: AssistantUrgency
  messages?: ChatMessageRecord[]
}

export class AssistantApiError extends Error {
  retryAfterSeconds?: number

  constructor(message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'AssistantApiError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export async function queryHealthAssistant(query: string): Promise<AssistantQueryResponse> {
  const response = await authenticatedFetch('/api/ai/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    let errorMessage = 'Unable to reach assistant right now. Please try again.'
    let retryAfterSeconds: number | undefined
    try {
      const parsed = await response.json()
      if (parsed?.error) {
        errorMessage = parsed.error
      }
      if (typeof parsed?.retryAfterSeconds === 'number') {
        retryAfterSeconds = parsed.retryAfterSeconds
      }
    } catch {
      // keep fallback message
    }
    throw new AssistantApiError(errorMessage, retryAfterSeconds)
  }

  const data = (await response.json()) as AssistantQueryResponse
  return data
}

export async function fetchChatHistory(): Promise<ChatMessageRecord[]> {
  const response = await authenticatedFetch('/api/ai/query', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Unable to load chat history right now. Please try again.')
  }

  const data = (await response.json()) as { messages?: ChatMessageRecord[] }
  return Array.isArray(data.messages) ? data.messages : []
}
