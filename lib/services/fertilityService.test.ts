import { describe, expect, it, jest, beforeEach } from '@jest/globals'

const mockUpsert = jest.fn() as jest.Mock
const mockFindMany = jest.fn() as jest.Mock
const mockPredictNextPeriod = jest.fn() as jest.Mock

jest.mock('@/lib/prisma', () => ({
  prisma: {
    fertilityLog: {
      upsert: mockUpsert,
      findMany: mockFindMany,
    },
  },
}))

jest.mock('@/lib/services/cycleService', () => ({
  predictNextPeriod: mockPredictNextPeriod,
}))

const {
  logFertilityData,
  refineOvulationPrediction,
  getFertilityInsights,
} = require('@/lib/services/fertilityService')

function d(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

describe('fertilityService', () => {
  beforeEach(() => {
    mockUpsert.mockReset()
    mockFindMany.mockReset()
    mockPredictNextPeriod.mockReset()
  })

  it('upserts fertility data by user/date', async () => {
    mockUpsert.mockResolvedValue({ id: 'f1', date: d('2026-04-17') })

    await logFertilityData('user-1', {
      date: '2026-04-17',
      basalTemp: 36.6,
      ovulationTest: true,
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_date: {
            userId: 'user-1',
            date: d('2026-04-17'),
          },
        },
      })
    )
  })

  it('refines ovulation from positive test and basal temp rise', async () => {
    mockPredictNextPeriod.mockResolvedValue({
      nextPeriodDate: '2026-04-28',
      ovulationWindow: {
        startDate: '2026-04-12',
        ovulationDate: '2026-04-14',
        endDate: '2026-04-16',
      },
    })

    mockFindMany.mockResolvedValue([
      { date: d('2026-04-08'), basalTemp: 36.2, ovulationTest: false },
      { date: d('2026-04-09'), basalTemp: 36.1, ovulationTest: false },
      { date: d('2026-04-10'), basalTemp: 36.2, ovulationTest: false },
      { date: d('2026-04-11'), basalTemp: 36.1, ovulationTest: false },
      { date: d('2026-04-12'), basalTemp: 36.2, ovulationTest: true },
      { date: d('2026-04-13'), basalTemp: 36.5, ovulationTest: false },
      { date: d('2026-04-14'), basalTemp: 36.6, ovulationTest: false },
      { date: d('2026-04-15'), basalTemp: 36.7, ovulationTest: false },
      { date: d('2026-04-16'), basalTemp: 36.7, ovulationTest: false },
    ])

    const result = await refineOvulationPrediction('user-1', '2026-04-17')

    expect(result.estimatedOvulationDate).toBe('2026-04-13')
    expect(result.confidence).toBe('high')
    expect(result.signals.ovulationTestPositive).toBe(true)
    expect(result.signals.basalTempRiseDetected).toBe(true)
  })

  it('returns practical fertility insights summary notes', async () => {
    mockPredictNextPeriod.mockResolvedValue({
      nextPeriodDate: '2026-04-30',
      ovulationWindow: {
        startDate: '2026-04-14',
        ovulationDate: '2026-04-16',
        endDate: '2026-04-18',
      },
    })

    mockFindMany
      .mockResolvedValueOnce([{ date: d('2026-04-12'), basalTemp: 36.5, ovulationTest: true }])
      .mockResolvedValueOnce([
        {
          date: d('2026-04-12'),
          cervicalMucus: 'egg_white',
          ovulationTest: true,
          basalTemp: 36.5,
        },
      ])

    const insights = await getFertilityInsights('user-1', '2026-04-17')

    expect(insights.confidence).toBe('medium')
    expect(insights.notes.join(' ')).toContain('Patterns suggest')
  })
})
