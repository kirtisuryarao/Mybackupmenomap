import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'

import { prisma } from '@/lib/prisma'
import { getCycleHistory, logPeriodEnd, logPeriodStart, predictNextPeriod } from '@/lib/services/cycleService'
import { createSeedUser, seedRegularCycleStarts } from '@/tests/integration-db/seed'
import { resetTestDatabase } from '@/tests/setup/test-db'

describe('DB integration: cycle service', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('predicts from seeded cycle history', async () => {
    const user = await createSeedUser()
    await seedRegularCycleStarts(user.id)

    const prediction = await predictNextPeriod(user.id, '2026-02-27')

    expect(prediction).not.toBeNull()
    expect(prediction?.nextPeriodDate).toBe('2026-03-26')
    expect(prediction?.cycleLengthUsed).toBe(28)
  })

  it('logs period start/end and exposes newest history first', async () => {
    const user = await createSeedUser()

    await logPeriodStart(user.id, '2026-03-01')
    await logPeriodEnd(user.id, '2026-03-05')
    await logPeriodStart(user.id, '2026-03-29')

    const history = await getCycleHistory(user.id)

    expect(history).toHaveLength(2)
    expect(history[0].startDate).toBe('2026-03-29')
    expect(history[1].recordedPeriodDuration).toBe(5)
  })
})