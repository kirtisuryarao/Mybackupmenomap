import Groq from 'groq-sdk'
import { prisma } from '@/lib/prisma'
import {
  buildCycleRecords,
  detectCycleStarts,
  predictNextCycle,
  weightedAverageCycleLength,
  averagePeriodLength,
} from '@/lib/cycle-engine'

const DEFAULT_CYCLE_LENGTH = 28
const MIN_CYCLE_LENGTH = 20
const MAX_CYCLE_LENGTH = 40
const MAX_PERIOD_LENGTH_DAYS = 7

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

interface FlowLogRecord {
  id: string
  date: Date
  flow: string | null
  spotting: string | null
}

export interface CycleRecalculationResult {
  hasCycleData: boolean
  hasAnyLogs: boolean
  lastPeriodDate: string | null
  cycleLength: number
  cycleStarts: string[]
  prediction: {
    predictedPeriodDate: string
    ovulationDate: string
    fertileWindowStart: string
    fertileWindowEnd: string
    confidence: number
    method: 'rule_based' | 'ml'
  } | null
  ignoredFlowDates: string[]
}

export async function validateFlowEntryLength(
  userId: string,
  targetDate: Date,
  maxPeriodLength: number = MAX_PERIOD_LENGTH_DAYS
): Promise<boolean> {
  const dayStart = toDayStart(targetDate)
  const rangeStart = new Date(dayStart)
  rangeStart.setDate(rangeStart.getDate() - maxPeriodLength - 2)

  const rangeEnd = new Date(dayStart)
  rangeEnd.setDate(rangeEnd.getDate() + maxPeriodLength + 2)

  const nearby = await prisma.dailyLog.findMany({
    where: {
      userId,
      flow: { not: null },
      date: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    orderBy: { date: 'asc' },
    select: { date: true },
  })

  const dateSet = new Set(nearby.map((item) => toYmd(item.date)))
  dateSet.add(toYmd(dayStart))

  const sortedDates = Array.from(dateSet)
    .map((d) => new Date(`${d}T00:00:00`))
    .sort((a, b) => a.getTime() - b.getTime())

  const target = toYmd(dayStart)
  let run = 1
  let maxRunAroundTarget = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = dayDiff(sortedDates[i - 1], sortedDates[i])
    if (diff === 1) {
      run += 1
    } else {
      run = 1
    }

    const currentYmd = toYmd(sortedDates[i])
    const previousYmd = toYmd(sortedDates[i - 1])
    if (currentYmd === target || previousYmd === target) {
      maxRunAroundTarget = Math.max(maxRunAroundTarget, run)
    }
  }

  return maxRunAroundTarget <= maxPeriodLength
}

export async function recomputeCycleForUser(
  userId: string,
  options?: { persist?: boolean }
): Promise<CycleRecalculationResult> {
  const persist = options?.persist ?? true

  try {
    console.log(`[CycleRecalc] Starting cycle recomputation for user ${userId}`)
    
    let allLogs
    try {
      allLogs = await prisma.dailyLog.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          flow: true,
          spotting: true,
        },
      })
      console.log(`[CycleRecalc] Fetched ${allLogs.length} logs for user ${userId}`)
    } catch (logError) {
      console.error(`[CycleRecalc] Error fetching logs:`, logError)
      throw logError
    }

    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { cycleLength: true },
      })
      if (!user) {
        console.warn(`[CycleRecalc] User not found: ${userId}`)
      }
    } catch (userError) {
      console.error(`[CycleRecalc] Error fetching user:`, userError)
      throw userError
    }

    const hasAnyLogs = allLogs.length > 0
    const flowLogs = allLogs.filter((log) => !!log.flow)
    const { normalizedFlowLogs, ignoredFlowIds, ignoredFlowDates } = normalizeFlowLogs(flowLogs)

    const fallbackFlowLogs =
      normalizedFlowLogs.length === 0 && allLogs.length > 0
        ? [
            {
              id: allLogs[allLogs.length - 1].id,
              date: allLogs[allLogs.length - 1].date,
              flow: 'light',
              spotting: allLogs[allLogs.length - 1].spotting,
            },
          ]
        : []

    const effectiveFlowLogs =
      normalizedFlowLogs.length > 0 ? normalizedFlowLogs : fallbackFlowLogs

    if (effectiveFlowLogs.length === 0) {
      if (persist) {
        await clearComputedCycleData(userId)
      }

      return {
        hasCycleData: false,
        hasAnyLogs,
        lastPeriodDate: null,
        cycleLength: clampCycleLength(user?.cycleLength ?? DEFAULT_CYCLE_LENGTH),
        cycleStarts: [],
        prediction: null,
        ignoredFlowDates,
      }
    }

    const starts = detectCycleStarts(
      normalizedFlowLogs.map((log) => ({
        date: log.date,
        flow: log.flow,
        spotting: log.spotting,
      }))
    )

    if (starts.length === 0) {
      if (persist) {
        await clearComputedCycleData(userId)
      }

      return {
        hasCycleData: false,
        hasAnyLogs,
        lastPeriodDate: null,
        cycleLength: clampCycleLength(user?.cycleLength ?? DEFAULT_CYCLE_LENGTH),
        cycleStarts: [],
        prediction: null,
        ignoredFlowDates,
      }
    }

    const cycleRecords = buildCycleRecords(
      starts,
      normalizedFlowLogs.map((log) => ({
        date: log.date,
        flow: log.flow,
        spotting: log.spotting,
      }))
    )

    const weightedAverage = clampCycleLength(weightedAverageCycleLength(cycleRecords))
    const aiCycleLength = await estimateCycleLengthWithAI(cycleRecords, weightedAverage)

    const cycleLength = clampCycleLength(aiCycleLength.cycleLength)
    const lastStart = starts[starts.length - 1]
    const predictionBase = predictNextCycle(lastStart, cycleLength, cycleRecords.length)
    const prediction = {
      predictedPeriodDate: toYmd(predictionBase.predictedPeriodDate),
      ovulationDate: toYmd(predictionBase.ovulationDate),
      fertileWindowStart: toYmd(predictionBase.fertileWindowStart),
      fertileWindowEnd: toYmd(predictionBase.fertileWindowEnd),
      confidence: predictionBase.confidence,
      method: aiCycleLength.method,
    }

    console.log(`[CycleRecalc] Computation successful for user ${userId}:`, {
      cycleStarts: starts.length,
      cycleLength,
      hasCycleData: true,
    })

  if (persist) {
    try {
      console.log(`[CycleRecalc] Persisting cycle data for user ${userId}`)
      await prisma.$transaction(async (tx) => {
        await tx.cycle.deleteMany({ where: { userId } })

        for (const record of cycleRecords) {
          await tx.cycle.create({
            data: {
              userId,
              startDate: toDayStart(record.startDate),
              endDate: record.endDate ? toDayStart(record.endDate) : null,
              length: record.length ?? null,
              periodLength: record.periodLength ?? null,
            },
          })
        }

        await tx.prediction.deleteMany({ where: { userId } })
        await tx.prediction.create({
          data: {
            userId,
            predictedPeriodDate: new Date(`${prediction.predictedPeriodDate}T00:00:00`),
            ovulationDate: new Date(`${prediction.ovulationDate}T00:00:00`),
            fertileWindowStart: new Date(`${prediction.fertileWindowStart}T00:00:00`),
            fertileWindowEnd: new Date(`${prediction.fertileWindowEnd}T00:00:00`),
            confidence: prediction.confidence,
            method: prediction.method,
          },
        })

        await tx.cycleEntry.create({
          data: {
            userId,
            lastPeriodDate: toDayStart(lastStart),
            cycleLength,
          },
        })

        await tx.user.update({
          where: { id: userId },
          data: {
            cycleLength,
            periodDuration: averagePeriodLength(cycleRecords),
          },
        })

        if (ignoredFlowIds.length > 0) {
          await tx.dailyLog.updateMany({
            where: { id: { in: ignoredFlowIds } },
            data: { flow: null },
          })
        }
      })
      console.log(`[CycleRecalc] Cycle data persisted successfully for user ${userId}`)
    } catch (persistError) {
      console.error(`[CycleRecalc] Error persisting cycle data for user ${userId}:`, persistError)
      throw persistError
    }
  }

  return {
    hasCycleData: true,
    hasAnyLogs,
    lastPeriodDate: toYmd(lastStart),
    cycleLength,
    cycleStarts: starts.map(toYmd),
    prediction,
    ignoredFlowDates,
  }
  } catch (error) {
    console.error(`[CycleRecalc] CRITICAL ERROR in recomputeCycleForUser for ${userId}:`, error)
    throw error
  }
}

async function clearComputedCycleData(userId: string) {
  await prisma.$transaction(async (tx) => {
    // Only clear auto-detected cycles and predictions
    // Keep the user's manually set CycleEntry
    await tx.cycle.deleteMany({ where: { userId } })
    await tx.prediction.deleteMany({ where: { userId } })
  })
}

function normalizeFlowLogs(logs: FlowLogRecord[]) {
  if (logs.length === 0) {
    return {
      normalizedFlowLogs: [] as FlowLogRecord[],
      ignoredFlowIds: [] as string[],
      ignoredFlowDates: [] as string[],
    }
  }

  const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime())
  const normalizedFlowLogs: FlowLogRecord[] = []
  const ignoredFlowIds: string[] = []
  const ignoredFlowDates: string[] = []

  let streakCount = 0

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = i > 0 ? sorted[i - 1] : null

    if (!previous) {
      streakCount = 1
    } else {
      const diff = dayDiff(previous.date, current.date)
      streakCount = diff === 1 ? streakCount + 1 : 1
    }

    if (streakCount <= MAX_PERIOD_LENGTH_DAYS) {
      normalizedFlowLogs.push(current)
    } else {
      ignoredFlowIds.push(current.id)
      ignoredFlowDates.push(toYmd(current.date))
    }
  }

  return { normalizedFlowLogs, ignoredFlowIds, ignoredFlowDates }
}

async function estimateCycleLengthWithAI(cycleRecords: Array<{ length?: number | null }>, fallback: number) {
  const lengths = cycleRecords
    .map((record) => record.length)
    .filter((value): value is number => typeof value === 'number' && value >= MIN_CYCLE_LENGTH && value <= 60)

  if (lengths.length < 2 || !groq) {
    return { cycleLength: fallback, method: 'rule_based' as const }
  }

  const prompt = [
    'Predict next menstrual cycle length in days from history.',
    `Cycle lengths: [${lengths.join(', ')}]`,
    'Return JSON only: {"cycleLength": number} with an integer between 20 and 40.',
  ].join('\n')

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 80,
      messages: [
        { role: 'system', content: 'You are a strict JSON generator.' },
        { role: 'user', content: prompt },
      ],
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) {
      return { cycleLength: fallback, method: 'rule_based' as const }
    }

    const parsed = JSON.parse(match[0]) as { cycleLength?: number }
    const cycleLength = clampCycleLength(parsed.cycleLength ?? fallback)

    return {
      cycleLength,
      method: 'ml' as const,
    }
  } catch {
    return { cycleLength: fallback, method: 'rule_based' as const }
  }
}

function dayDiff(a: Date, b: Date) {
  const left = toDayStart(a).getTime()
  const right = toDayStart(b).getTime()
  return Math.round((right - left) / 86400000)
}

function toDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toYmd(date: Date) {
  const d = toDayStart(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clampCycleLength(value: number) {
  return Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, Math.round(value)))
}
