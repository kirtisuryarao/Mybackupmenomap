import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const mockDailyLogFindMany = jest.fn() as jest.Mock
const mockFertilityFindMany = jest.fn() as jest.Mock
const mockPredictNextPeriod = jest.fn() as jest.Mock

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dailyLog: { findMany: mockDailyLogFindMany },
    fertilityLog: { findMany: mockFertilityFindMany },
  },
}))

jest.mock('@/lib/services/cycleService', () => ({
  predictNextPeriod: mockPredictNextPeriod,
}))

const { detectRedFlags, maskSensitiveSymptoms } = require('@/lib/services/safetyService')

describe('safetyService', () => {
  beforeEach(() => {
    mockDailyLogFindMany.mockReset()
    mockFertilityFindMany.mockReset()
    mockPredictNextPeriod.mockReset()
  })

  it('detects severe pain red flag from query text', async () => {
    const result = await detectRedFlags('user-1', 'I have severe pain and cannot stand it')

    expect(result).not.toBeNull()
    expect(result?.type).toBe('alert')
    expect(result?.urgency).toBe('high')
  })

  it('detects missed period with pregnancy risk when overdue', async () => {
    mockDailyLogFindMany.mockResolvedValue([])
    mockFertilityFindMany.mockResolvedValue([{ intercourse: true }])
    mockPredictNextPeriod.mockResolvedValue({
      nextPeriodDate: '2026-04-01',
    })

    const result = await detectRedFlags('user-1', 'I have a missed period and pregnancy risk')

    expect(result?.reason).toBe('missed_period_pregnancy_risk')
  })

  it('masks sensitive symptom words for safe logs', () => {
    const masked = maskSensitiveSymptoms('Heavy bleeding and cramps with dizziness')

    expect(masked.toLowerCase()).not.toContain('bleeding')
    expect(masked.toLowerCase()).not.toContain('cramps')
    expect(masked).toContain('[symptom]')
  })
})
