import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockCreateCompletion = jest.fn() as jest.Mock
const mockSymptomFindMany = jest.fn() as jest.Mock
const mockFertilityFindMany = jest.fn() as jest.Mock
const mockPredictNextPeriod = jest.fn() as jest.Mock

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  }))
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    symptomLog: { findMany: mockSymptomFindMany },
    fertilityLog: { findMany: mockFertilityFindMany },
  },
}))

jest.mock('@/lib/services/cycleService', () => ({
  predictNextPeriod: mockPredictNextPeriod,
}))

const { generateHealthResponse } = require('@/lib/services/aiService')

describe('aiService', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key'
    mockCreateCompletion.mockReset()
    mockSymptomFindMany.mockReset()
    mockFertilityFindMany.mockReset()
    mockPredictNextPeriod.mockReset()
  })

  it('returns non-diagnostic response with mandatory disclaimer', async () => {
    mockPredictNextPeriod.mockResolvedValue({
      nextPeriodDate: '2026-05-01',
      ovulationWindow: {
        startDate: '2026-04-15',
        ovulationDate: '2026-04-17',
        endDate: '2026-04-19',
      },
    })

    mockSymptomFindMany.mockResolvedValue([{ category: 'mood', severity: 3 }])
    mockFertilityFindMany.mockResolvedValue([{ ovulationTest: true, basalTemp: 36.6 }])

    mockCreateCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'You have PCOS and this is definitely hormonal imbalance.',
          },
        },
      ],
    })

    const result = await generateHealthResponse('user-1', 'Why are my cycles irregular?')

    expect(result.type).toBe('normal')
    expect(result.disclaimer).toContain('not medical advice')
    expect(result.response.toLowerCase()).not.toContain('you have pcos')
    expect(['low', 'medium', 'high']).toContain(result.confidence)
  })
})
