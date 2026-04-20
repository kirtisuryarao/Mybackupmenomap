import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockCycleFindMany = jest.fn() as jest.Mock
const mockSymptomFindMany = jest.fn() as jest.Mock

jest.mock('@/lib/prisma', () => ({
  prisma: {
    cycle: {
      findMany: mockCycleFindMany,
    },
    symptomLog: {
      findMany: mockSymptomFindMany,
    },
  },
}))

const { getHealthInsights } = require('@/lib/services/insightService')

describe('insightService', () => {
  beforeEach(() => {
    mockCycleFindMany.mockReset()
    mockSymptomFindMany.mockReset()
  })

  it('flags irregular patterns when cycles are consistently long', async () => {
    mockCycleFindMany.mockResolvedValue([
      { cycleLength: 38 },
      { cycleLength: 37 },
      { cycleLength: 40 },
      { cycleLength: 36 },
    ])
    mockSymptomFindMany.mockResolvedValue([{ severity: 2 }])

    const result = await getHealthInsights('user-1')

    expect(result.some((item) => item.insight.includes('longer cycle lengths'))).toBe(true)
  })

  it('returns high-severity caution when high symptoms and irregular cycles co-occur', async () => {
    mockCycleFindMany.mockResolvedValue([
      { cycleLength: 40 },
      { cycleLength: 39 },
      { cycleLength: 38 },
      { cycleLength: 37 },
    ])
    mockSymptomFindMany.mockResolvedValue([{ severity: 5 }, { severity: 4 }, { severity: 4 }, { severity: 5 }, { severity: 4 }])

    const result = await getHealthInsights('user-1')

    const high = result.find((item) => item.severity === 'high')
    expect(high).toBeDefined()
    expect(high?.recommendation).toContain('consulting')
  })
})
