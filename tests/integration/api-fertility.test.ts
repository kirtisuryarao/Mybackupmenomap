import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { NextResponse } from 'next/server'
import request from 'supertest'

const mockAuthenticateRequest = jest.fn() as jest.Mock
const mockLogFertilityData = jest.fn() as jest.Mock

jest.mock('@/lib/middleware', () => ({
  authenticateRequest: mockAuthenticateRequest,
}))

jest.mock('@/lib/services/fertilityService', () => ({
  logFertilityData: mockLogFertilityData,
}))

import { createRouteTestServer } from '@/tests/helpers/route-test-server'

const { POST: postFertilityLogRoute } = require('@/app/api/fertility/log/route')

describe('POST /api/fertility/log', () => {
  beforeEach(() => {
    mockAuthenticateRequest.mockReset()
    mockLogFertilityData.mockReset()
  })

  it('protects route when unauthenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const server = createRouteTestServer([
      { method: 'POST', path: '/api/fertility/log', handler: postFertilityLogRoute },
    ])

    const response = await request(server).post('/api/fertility/log').send({ date: '2026-04-17' })
    expect(response.status).toBe(401)
    server.close()
  })

  it('validates unrealistic temperature values', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })

    const server = createRouteTestServer([
      { method: 'POST', path: '/api/fertility/log', handler: postFertilityLogRoute },
    ])

    const response = await request(server)
      .post('/api/fertility/log')
      .send({ date: '2026-04-17', basalTemp: 41 })

    expect(response.status).toBe(400)
    server.close()
  })

  it('returns created record on valid payload', async () => {
    mockAuthenticateRequest.mockResolvedValue({ user: { userId: 'user-1' } })
    mockLogFertilityData.mockResolvedValue({ id: 'f1' })

    const server = createRouteTestServer([
      { method: 'POST', path: '/api/fertility/log', handler: postFertilityLogRoute },
    ])

    const response = await request(server)
      .post('/api/fertility/log')
      .send({ date: '2026-04-17', basalTemp: 36.6 })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ success: true, data: { id: 'f1' } })
    server.close()
  })
})
