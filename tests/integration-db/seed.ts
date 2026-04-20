import { prisma } from '@/lib/prisma'

export interface SeededUser {
  id: string
  email: string
}

export async function createSeedUser(overrides?: Partial<{ email: string; cycleLength: number; periodDuration: number }>): Promise<SeededUser> {
  const email = overrides?.email ?? `db-test-${Date.now()}@example.com`
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'test-hash',
      name: 'DB Test User',
      cycleLength: overrides?.cycleLength ?? 28,
      periodDuration: overrides?.periodDuration ?? 5,
    },
    select: {
      id: true,
      email: true,
    },
  })

  return user
}

export async function seedRegularCycleStarts(userId: string) {
  await prisma.cycle.createMany({
    data: [
      {
        userId,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-01-05T00:00:00.000Z'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        userId,
        startDate: new Date('2026-01-29T00:00:00.000Z'),
        endDate: new Date('2026-02-02T00:00:00.000Z'),
        cycleLength: 28,
        periodDuration: 5,
      },
      {
        userId,
        startDate: new Date('2026-02-26T00:00:00.000Z'),
        endDate: null,
        cycleLength: 28,
        periodDuration: 5,
      },
    ],
  })
}

export async function seedFertilitySignalLogs(userId: string) {
  await prisma.fertilityLog.createMany({
    data: [
      {
        userId,
        date: new Date('2026-04-09T00:00:00.000Z'),
        basalTemp: 36.4,
        ovulationTest: false,
        cervicalMucus: 'creamy',
      },
      {
        userId,
        date: new Date('2026-04-10T00:00:00.000Z'),
        basalTemp: 36.5,
        ovulationTest: true,
        cervicalMucus: 'egg_white',
      },
    ],
  })
}