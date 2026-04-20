import { describe, expect, it } from '@jest/globals'

import { buildCyclePrediction } from '@/lib/services/cycleService'

type BuildPredictionCycles = Parameters<typeof buildCyclePrediction>[0]
type BuildPredictionProfile = Parameters<typeof buildCyclePrediction>[1]

function d(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

describe('buildCyclePrediction', () => {
  it('falls back to profile values with sparse history', () => {
    const cycles: BuildPredictionCycles = [
      {
        id: 'c1',
        startDate: d('2026-03-01'),
        endDate: d('2026-03-05'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c2',
        startDate: d('2026-03-29'),
        endDate: d('2026-04-02'),
        cycleLength: 28,
        periodDuration: 5,
      },
    ]

    const profile: BuildPredictionProfile = {
      id: 'u1',
      cycleLength: 30,
      periodDuration: 6,
    }

    const prediction = buildCyclePrediction(cycles, profile, d('2026-04-10'))

    expect(prediction).not.toBeNull()
    expect(prediction?.cycleLengthUsed).toBe(30)
    expect(prediction?.confidence).toBe('low')
    expect(prediction?.nextPeriodDate).toBe('2026-04-28')
  })

  it('advances stale predictions forward for skipped cycles', () => {
    const cycles: BuildPredictionCycles = [
      {
        id: 'c1',
        startDate: d('2025-10-01'),
        endDate: d('2025-10-05'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c2',
        startDate: d('2025-10-29'),
        endDate: d('2025-11-02'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c3',
        startDate: d('2025-11-26'),
        endDate: d('2025-11-30'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c4',
        startDate: d('2025-12-24'),
        endDate: null,
        cycleLength: 28,
        periodDuration: 5,
      },
    ]

    const profile: BuildPredictionProfile = {
      id: 'u2',
      cycleLength: 28,
      periodDuration: 5,
    }

    const referenceDate = d('2026-04-17')
    const prediction = buildCyclePrediction(cycles, profile, referenceDate)

    expect(prediction).not.toBeNull()
    expect(prediction?.confidence).toBe('low')
    expect(d(prediction!.nextPeriodDate).getTime()).toBeGreaterThan(referenceDate.getTime())
  })

  it('returns low confidence when cycle variance is high even with enough history', () => {
    const cycles: BuildPredictionCycles = [
      {
        id: 'c1',
        startDate: d('2025-11-01'),
        endDate: d('2025-11-05'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c2',
        startDate: d('2025-11-21'),
        endDate: d('2025-11-25'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c3',
        startDate: d('2025-12-31'),
        endDate: d('2026-01-04'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c4',
        startDate: d('2026-01-18'),
        endDate: d('2026-01-22'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c5',
        startDate: d('2026-03-01'),
        endDate: d('2026-03-05'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        id: 'c6',
        startDate: d('2026-03-22'),
        endDate: null,
        cycleLength: 28,
        periodDuration: 5,
      },
    ]

    const profile: BuildPredictionProfile = {
      id: 'u3',
      cycleLength: 29,
      periodDuration: 5,
    }

    const prediction = buildCyclePrediction(cycles, profile, d('2026-04-17'))

    expect(prediction).not.toBeNull()
    expect(prediction?.basedOnCycles).toBe(5)
    expect(prediction?.varianceDays).toBeGreaterThan(7)
    expect(prediction?.confidence).toBe('low')
  })
})
