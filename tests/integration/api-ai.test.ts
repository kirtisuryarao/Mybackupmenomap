import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { NextResponse } from 'next/server'
import request from 'supertest'

const mockAuthenticateRequest = jest.fn() as jest.Mock
const mockDetectRedFlags = jest.fn() as jest.Mock
const mockGenerateHealthResponse = jest.fn() as jest.Mock
const mockMaskSensitiveSymptoms = jest.fn((value: string) => value) as jest.Mock
const mockCreateMessage = jest.fn() as jest.Mock
const mockStoreAIResponse = jest.fn() as jest.Mock
const mockGetChatHistory = jest.fn() as jest.Mock

jest.mock('@/lib/middleware', () => ({
  authenticateRequest: mockAuthenticateRequest,
}))

jest.mock('@/lib/services/safetyService', () => ({
  detectRedFlags: mockDetectRedFlags,
  maskSensitiveSymptoms: mockMaskSensitiveSymptoms,
}))

jest.mock('@/lib/services/aiService', () => ({
  generateHealthResponse: mockGenerateHealthResponse,
}))

jest.mock('@/lib/services/chatService', () => ({
  createMessage: mockCreateMessage,
  storeAIResponse: mockStoreAIResponse,
  getChatHistory: mockGetChatHistory,
}))

import { createRouteTestServer } from '@/tests/helpers/route-test-server'

const { GET: getAiQueryRoute, POST: postAiQueryRoute } = require('@/app/api/ai/query/route')

describe('POST /api/ai/query', () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockReset()
    mockDetectRedFlags.mockReset()
    mockGenerateHealthResponse.mockReset()
    mockMaskSensitiveSymptoms.mockClear()
    mockCreateMessage.mockReset()
    mockStoreAIResponse.mockReset()
    mockGetChatHistory.mockReset()
    mockCreateMessage.mockResolvedValue({ id: 'message-1' })
    mockStoreAIResponse.mockResolvedValue({ id: 'message-2' })
    mockGetChatHistory.mockResolvedValue([])
  })

  it('protects route when unauthenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const server = createRouteTestServer([
      { method: 'POST', path: '/api/ai/query', handler: postAiQueryRoute },
    ])

    const response = await request(server).post('/api/ai/query').send({ query: 'Need advice' })
    expect(response.status).toBe(401)
    server.close()
  })

  it('returns alert payload when red flags are detected', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })
    mockDetectRedFlags.mockResolvedValue({
      type: 'alert',
      message: 'You should seek medical attention',
      urgency: 'high',
      reason: 'severe_pain',
    })

    const server = createRouteTestServer([
      { method: 'POST', path: '/api/ai/query', handler: postAiQueryRoute },
    ])

    const response = await request(server).post('/api/ai/query').send({ query: 'Severe pain and heavy bleeding' })

    expect(response.status).toBe(200)
    expect(response.body.type).toBe('alert')
    expect(response.body.urgency).toBe('high')
    expect(mockCreateMessage).toHaveBeenCalledWith('user-1', 'user', 'Severe pain and heavy bleeding')
    expect(mockStoreAIResponse).toHaveBeenCalledWith('user-1', 'You should seek medical attention')
    expect(response.body.messages).toEqual([])
    server.close()
  })

  it('returns normal response when no red flags', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })
    mockDetectRedFlags.mockResolvedValue(null)
    mockGenerateHealthResponse.mockResolvedValue({
      type: 'normal',
      response: 'This may indicate normal variation.',
      disclaimer: 'This is not medical advice. Consult a healthcare professional.',
      confidence: 'medium',
    })

    const server = createRouteTestServer([
      { method: 'POST', path: '/api/ai/query', handler: postAiQueryRoute },
    ])

    const response = await request(server).post('/api/ai/query').send({ query: 'Is my cycle normal?' })

    expect(response.status).toBe(200)
    expect(response.body.type).toBe('normal')
    expect(response.body.confidence).toBe('medium')
    expect(mockCreateMessage).toHaveBeenCalledWith('user-1', 'user', 'Is my cycle normal?')
    expect(mockStoreAIResponse).toHaveBeenCalledWith('user-1', 'This may indicate normal variation.')
    expect(response.body.messages).toEqual([])
    server.close()
  })
})

describe('GET /api/ai/query', () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockReset()
    mockGetChatHistory.mockReset()
  })

  it('returns chat history for the authenticated user', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })
    mockGetChatHistory.mockResolvedValue([
      {
        id: 'message-1',
        userId: 'user-1',
        role: 'user',
        content: 'Hello',
        createdAt: '2024-01-01T10:00:00.000Z',
      },
    ])

    const server = createRouteTestServer([
      { method: 'GET', path: '/api/ai/query', handler: getAiQueryRoute },
    ])

    const response = await request(server).get('/api/ai/query')

    expect(response.status).toBe(200)
    expect(response.body.messages).toHaveLength(1)
    expect(response.body.messages[0].content).toBe('Hello')
    server.close()
  })
})
