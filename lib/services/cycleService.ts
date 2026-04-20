import { prisma } from '@/lib/prisma'

const MIN_CYCLE_LENGTH = 15
const MAX_CYCLE_LENGTH = 90
const MIN_PERIOD_DURATION = 1
const MAX_PERIOD_DURATION = 14
const HISTORY_WINDOW_MIN = 3
const HISTORY_WINDOW_MAX = 6
const OVULATION_OFFSET_DAYS = 14
const FERTILE_WINDOW_RADIUS_DAYS = 2

export type PredictionConfidence = 'high' | 'medium' | 'low'

export interface CycleHistoryItem {
  id: string
  startDate: string
  endDate: string | null
  cycleLength: number
  periodDuration: number
  recordedPeriodDuration: number | null
}

export interface OvulationWindow {
  startDate: string
  ovulationDate: string
  endDate: string
}

export interface CyclePrediction {
  nextPeriodDate: string
  ovulationWindow: OvulationWindow
  confidence: PredictionConfidence
  basedOnCycles: number
  cycleLengthUsed: number
  periodDurationUsed: number
  varianceDays: number
}

interface UserCycleProfile {
  id: string
  cycleLength: number
  periodDuration: number
}

interface StoredCycle {
  id: string
  startDate: Date
  endDate: Date | null
  cycleLength: number
  periodDuration: number
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseYmd(value: string): Date {
  return toDayStart(new Date(`${value}T00:00:00`))
}

function formatYmd(date: Date): string {
  const normalized = toDayStart(date)
  const year = normalized.getFullYear()
  const month = String(normalized.getMonth() + 1).padStart(2, '0')
  const day = String(normalized.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayDiff(start: Date, end: Date): number {
  return Math.round((toDayStart(end).getTime() - toDayStart(start).getTime()) / 86400000)
}

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = average(values)
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function clampCycleLength(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, Math.round(value)))
}

function clampPeriodDuration(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(MIN_PERIOD_DURATION, Math.min(MAX_PERIOD_DURATION, Math.round(value)))
}

async function getUserProfile(userId: string): Promise<UserCycleProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, cycleLength: true, periodDuration: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user
}

async function getStoredCycles(userId: string): Promise<StoredCycle[]> {
  const cycles = await prisma.cycle.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      cycleLength: true,
      periodDuration: true,
    },
  })

  if (cycles.length > 0) {
    return cycles
  }

  const [profile, latestCycleEntry] = await Promise.all([
    getUserProfile(userId),
    prisma.cycleEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, lastPeriodDate: true, cycleLength: true },
    }),
  ])

  if (!latestCycleEntry) {
    return []
  }

  return [
    {
      id: latestCycleEntry.id,
      startDate: latestCycleEntry.lastPeriodDate,
      endDate: null,
      cycleLength: latestCycleEntry.cycleLength || profile.cycleLength,
      periodDuration: profile.periodDuration,
    },
  ]
}

function withObservedLengths(cycles: StoredCycle[]): StoredCycle[] {
  return cycles.map((cycle, index) => {
    const next = cycles[index + 1]
    if (!next) {
      return cycle
    }

    return {
      ...cycle,
      cycleLength: dayDiff(cycle.startDate, next.startDate),
    }
  })
}

function toHistoryItem(cycle: StoredCycle): CycleHistoryItem {
  const recordedPeriodDuration = cycle.endDate
    ? dayDiff(cycle.startDate, cycle.endDate) + 1
    : null

  return {
    id: cycle.id,
    startDate: formatYmd(cycle.startDate),
    endDate: cycle.endDate ? formatYmd(cycle.endDate) : null,
    cycleLength: cycle.cycleLength,
    periodDuration: cycle.periodDuration,
    recordedPeriodDuration,
  }
}

export function buildCyclePrediction(
  cycles: StoredCycle[],
  profile: UserCycleProfile,
  referenceDate: Date = new Date()
): CyclePrediction | null {
  if (cycles.length === 0) {
    return null
  }

  const normalizedCycles = withObservedLengths(cycles)
  const completedCycleLengths = normalizedCycles
    .slice(0, -1)
    .map((cycle) => cycle.cycleLength)
    .filter((value) => value >= MIN_CYCLE_LENGTH && value <= MAX_CYCLE_LENGTH)

  const completedPeriodDurations = normalizedCycles
    .map((cycle) => (cycle.endDate ? dayDiff(cycle.startDate, cycle.endDate) + 1 : cycle.periodDuration))
    .filter((value) => value >= MIN_PERIOD_DURATION && value <= MAX_PERIOD_DURATION)

  const analyzedCycleLengths = completedCycleLengths.slice(-HISTORY_WINDOW_MAX)
  const useHistory = analyzedCycleLengths.length >= HISTORY_WINDOW_MIN
  const cycleLengthUsed = useHistory
    ? clampCycleLength(Math.round(average(analyzedCycleLengths)), profile.cycleLength)
    : clampCycleLength(profile.cycleLength, 28)

  const periodDurationUsed = clampPeriodDuration(
    completedPeriodDurations.length > 0 ? Math.round(average(completedPeriodDurations.slice(-HISTORY_WINDOW_MAX))) : profile.periodDuration,
    profile.periodDuration
  )

  const varianceDays = Number(standardDeviation(analyzedCycleLengths).toFixed(2))

  let confidence: PredictionConfidence = 'low'
  if (useHistory) {
    if (varianceDays <= 2 && analyzedCycleLengths.length >= 5) {
      confidence = 'high'
    } else if (varianceDays <= 5) {
      confidence = 'medium'
    }

    if (varianceDays > 7) {
      confidence = 'low'
    }
  }

  const latestCycle = normalizedCycles[normalizedCycles.length - 1]
  let nextPeriodDate = new Date(latestCycle.startDate)
  nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLengthUsed)

  const normalizedReference = toDayStart(referenceDate)
  while (nextPeriodDate.getTime() <= normalizedReference.getTime()) {
    nextPeriodDate = new Date(nextPeriodDate)
    nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLengthUsed)
    confidence = 'low'
  }

  const ovulationDate = new Date(nextPeriodDate)
  ovulationDate.setDate(ovulationDate.getDate() - OVULATION_OFFSET_DAYS)

  const fertileStart = new Date(ovulationDate)
  fertileStart.setDate(fertileStart.getDate() - FERTILE_WINDOW_RADIUS_DAYS)

  const fertileEnd = new Date(ovulationDate)
  fertileEnd.setDate(fertileEnd.getDate() + FERTILE_WINDOW_RADIUS_DAYS)

  return {
    nextPeriodDate: formatYmd(nextPeriodDate),
    ovulationWindow: {
      startDate: formatYmd(fertileStart),
      ovulationDate: formatYmd(ovulationDate),
      endDate: formatYmd(fertileEnd),
    },
    confidence,
    basedOnCycles: analyzedCycleLengths.length,
    cycleLengthUsed,
    periodDurationUsed,
    varianceDays,
  }
}

export async function logPeriodStart(userId: string, date: string) {
  const startDate = parseYmd(date)
  const profile = await getUserProfile(userId)
  const cycles = await getStoredCycles(userId)
  const latestCycle = cycles[cycles.length - 1] ?? null

  if (latestCycle && formatYmd(latestCycle.startDate) === date) {
    return toHistoryItem(latestCycle)
  }

  if (latestCycle && startDate.getTime() < toDayStart(latestCycle.startDate).getTime()) {
    throw new Error('Period start cannot be before the latest tracked cycle start')
  }

  if (latestCycle?.endDate && startDate.getTime() <= toDayStart(latestCycle.endDate).getTime()) {
    throw new Error('New period start must be after the previous period end')
  }

  return prisma.$transaction(async (tx) => {
    if (latestCycle) {
      const observedCycleLength = dayDiff(latestCycle.startDate, startDate)
      await tx.cycle.update({
        where: { id: latestCycle.id },
        data: {
          cycleLength: clampCycleLength(observedCycleLength, latestCycle.cycleLength),
        },
      })
    }

    const created = await tx.cycle.create({
      data: {
        userId,
        startDate,
        endDate: null,
        cycleLength: clampCycleLength(profile.cycleLength, 28),
        periodDuration: clampPeriodDuration(profile.periodDuration, 5),
      },
    })

    await tx.cycleEntry.create({
      data: {
        userId,
        lastPeriodDate: startDate,
        cycleLength: clampCycleLength(profile.cycleLength, 28),
      },
    })

    return toHistoryItem(created)
  })
}

export async function logPeriodEnd(userId: string, date: string) {
  const endDate = parseYmd(date)
  const profile = await getUserProfile(userId)
  const cycles = await getStoredCycles(userId)
  const latestCycle = cycles[cycles.length - 1] ?? null

  if (!latestCycle) {
    throw new Error('Cannot log a period end before a period start')
  }

  if (endDate.getTime() < toDayStart(latestCycle.startDate).getTime()) {
    throw new Error('Period end must be on or after the period start')
  }

  const periodDuration = dayDiff(latestCycle.startDate, endDate) + 1
  if (periodDuration < MIN_PERIOD_DURATION || periodDuration > MAX_PERIOD_DURATION) {
    throw new Error(`Period duration must be between ${MIN_PERIOD_DURATION} and ${MAX_PERIOD_DURATION} days`)
  }

  const updated = await prisma.cycle.update({
    where: { id: latestCycle.id },
    data: {
      endDate,
      periodDuration: clampPeriodDuration(periodDuration, profile.periodDuration),
    },
  })

  return toHistoryItem(updated)
}

export async function getCycleHistory(userId: string): Promise<CycleHistoryItem[]> {
  const cycles = await getStoredCycles(userId)
  return withObservedLengths(cycles).map(toHistoryItem).reverse()
}

export async function predictNextPeriod(userId: string, referenceDate?: string): Promise<CyclePrediction | null> {
  const [profile, cycles] = await Promise.all([getUserProfile(userId), getStoredCycles(userId)])
  return buildCyclePrediction(cycles, profile, referenceDate ? parseYmd(referenceDate) : new Date())
}

export async function predictOvulationWindow(userId: string, referenceDate?: string): Promise<OvulationWindow | null> {
  const prediction = await predictNextPeriod(userId, referenceDate)
  return prediction?.ovulationWindow ?? null
}
