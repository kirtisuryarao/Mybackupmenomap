import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { NextResponse } from 'next/server'
import request from 'supertest'

const mockAuthenticateRequest = jest.fn() as jest.Mock
const mockPredictNextPeriod = jest.fn() as jest.Mock

jest.mock('@/lib/middleware', () => ({
  authenticateRequest: mockAuthenticateRequest,
}))

jest.mock('@/lib/services/cycleService', () => ({
  predictNextPeriod: mockPredictNextPeriod,
}))

import { createRouteTestServer } from '@/tests/helpers/route-test-server'

const { GET: getPredictionRoute } = require('@/app/api/cycle/prediction/route')

describe('GET /api/cycle/prediction', () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockReset()
    mockPredictNextPeriod.mockReset()
  })

  it('protects route when unauthenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const server = createRouteTestServer([
      { method: 'GET', path: '/api/cycle/prediction', handler: getPredictionRoute },
    ])

    const response = await request(server).get('/api/cycle/prediction')
    expect(response.status).toBe(401)
    server.close()
  })

  it('returns validation error for bad referenceDate', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })

    const server = createRouteTestServer([
      { method: 'GET', path: '/api/cycle/prediction', handler: getPredictionRoute },
    ])

    const response = await request(server).get('/api/cycle/prediction?referenceDate=17-04-2026')
    expect(response.status).toBe(500)
    server.close()
  })

  it('returns prediction for authenticated requests', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })
    mockPredictNextPeriod.mockResolvedValue({ nextPeriodDate: '2026-05-01' })

    const server = createRouteTestServer([
      { method: 'GET', path: '/api/cycle/prediction', handler: getPredictionRoute },
    ])

    const response = await request(server).get('/api/cycle/prediction?referenceDate=2026-04-17')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true, data: { nextPeriodDate: '2026-05-01' } })
    server.close()
  })
})
