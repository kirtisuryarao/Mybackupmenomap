import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'

import { prisma } from '@/lib/prisma'
import { getFertilityInsights, logFertilityData, refineOvulationPrediction } from '@/lib/services/fertilityService'
import { createSeedUser, seedFertilitySignalLogs } from '@/tests/integration-db/seed'
import { resetTestDatabase } from '@/tests/setup/test-db'

describe('DB integration: fertility service', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('upserts fertility logs in the database', async () => {
    const user = await createSeedUser()

    await logFertilityData(user.id, {
      date: '2026-04-10',
      basalTemp: 36.4,
      ovulationTest: false,
      cervicalMucus: 'creamy',
    })

    const updated = await logFertilityData(user.id, {
      date: '2026-04-10',
      basalTemp: 36.7,
      ovulationTest: true,
      cervicalMucus: 'egg_white',
    })

    expect(updated.ovulationTest).toBe(true)
    expect(updated.basalTemp).toBe(36.7)
  })

  it('refines ovulation date from seeded fertility signals', async () => {
    const user = await createSeedUser()
    await seedFertilitySignalLogs(user.id)

    const refined = await refineOvulationPrediction(user.id, '2026-04-12')

    expect(refined.estimatedOvulationDate).toBe('2026-04-11')
    expect(refined.confidence).toBe('medium')
    expect(refined.signals.ovulationTestPositive).toBe(true)
  })

  it('returns notes derived from seeded records', async () => {
    const user = await createSeedUser()
    await seedFertilitySignalLogs(user.id)

    const insights = await getFertilityInsights(user.id, '2026-04-12')

    expect(insights.notes).toContain('Patterns suggest fertile-type cervical mucus in recent days.')
    expect(insights.notes).toContain('Patterns suggest at least one positive ovulation test in the recent window.')
  })
})