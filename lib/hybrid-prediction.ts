import Groq from 'groq-sdk'
import { prisma } from '@/lib/prisma'

const DEFAULT_CYCLE_LENGTH = 28
const DEFAULT_PERIOD_DURATION = 5
const MIN_CYCLE_LENGTH = 20
const MAX_CYCLE_LENGTH = 40

type PredictionMethod = 'ml' | 'ml_personalized' | 'statistical' | 'rule_based'
type Phase = 'period' | 'follicular' | 'ovulation' | 'luteal'

interface MlServiceResponse {
  predicted_cycle_length?: number
  predictedPeriodCycleLength?: number
  predicted_period_date?: string
  predictedPeriodDate?: string
  ovulation_date?: string
  ovulationDate?: string
  fertile_window_start?: string
  fertileWindowStart?: string
  fertile_window_end?: string
  fertileWindowEnd?: string
  confidence?: number
  method?: string
}

interface DateRange {
  start: string
  end: string
}

export interface HybridPredictionResponse {
  predictedPeriodDate: string
  predictedCycleLength: number
  ovulationDate: string
  fertileWindowStart: string
  fertileWindowEnd: string
  confidence: number
  confidenceRangeDays: number
  method: PredictionMethod
  explanation: string
  cycleStarts: string[]
  cycleLengths: number[]
  periodDurations: number[]
  irregularity: {
    standardDeviation: number
    isIrregular: boolean
  }
  predictionRange: {
    earliest: string
    latest: string
    plusMinusDays: number
  }
  timeline: {
    pastCycles: Array<{ startDate: string; source: 'actual' | 'inferred' }>
    currentCycle: {
      startDate: string
      dayOfCycle: number
      phase: Phase
      estimatedEndDate: string
    }
    futureCycles: Array<{
      startDate: string
      ovulationDate: string
      fertileWindowStart: string
      fertileWindowEnd: string
    }>
  }
  calendarPhases: Array<{
    date: string
    dayOfCycle: number
    phase: Phase
    source: 'historical' | 'predicted'
  }>
}

interface BuildPredictionOptions {
  includeExplanation?: boolean
  persist?: boolean
}

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

export async function buildHybridPredictionForUser(
  userId: string,
  options?: BuildPredictionOptions
): Promise<HybridPredictionResponse> {
  const includeExplanation = options?.includeExplanation ?? true
  const persist = options?.persist ?? true

  const [user, cycleEntry, cycles] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        cycleLength: true,
        periodDuration: true,
      },
    }),
    prisma.cycleEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        lastPeriodDate: true,
        cycleLength: true,
      },
    }),
    prisma.cycle.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      select: {
        startDate: true,
        length: true,
        periodLength: true,
      },
    }),
  ])

  const cycleStarts = cycles.map((c) => toYmd(c.startDate))
  const cycleLengths = cycles
    .map((c) => c.length)
    .filter((value): value is number => typeof value === 'number' && value >= MIN_CYCLE_LENGTH && value <= 60)

  const periodDurations = cycles
    .map((c) => c.periodLength)
    .filter((value): value is number => typeof value === 'number' && value > 0 && value <= 14)

  const fallbackCycleLength = clampCycleLength(
    cycleLengths[cycleLengths.length - 1] ??
      cycleEntry?.cycleLength ??
      user?.cycleLength ??
      DEFAULT_CYCLE_LENGTH
  )

  const fallbackPeriodDuration = clampPeriodDuration(
    periodDurations[periodDurations.length - 1] ?? user?.periodDuration ?? DEFAULT_PERIOD_DURATION
  )

  const lastPeriodDate = getLastPeriodDate(cycleStarts, cycleEntry?.lastPeriodDate)
  const stdDev = standardDeviation(cycleLengths)
  const isIrregular = stdDev >= 4

  const mlPrediction = await getMlPrediction({
    userId,
    cycleStarts,
    cycleLengths,
    periodDurations,
    lastPeriodDate,
    avgCycleLength: mean(cycleLengths, fallbackCycleLength),
    cycleLengthStd: stdDev,
    recentCycleLengths: cycleLengths.slice(-6),
    gapsBetweenCycles: gaps(cycleStarts),
  })

  const statisticalLength = clampCycleLength(weightedAverage(cycleLengths, fallbackCycleLength))

  const predictedCycleLength = clampCycleLength(
    mlPrediction?.predictedCycleLength ?? statisticalLength
  )

  const method = (mlPrediction?.method ?? (cycleLengths.length >= 3 ? 'statistical' : 'rule_based')) as PredictionMethod

  const predictedPeriodDate = mlPrediction?.predictedPeriodDate ?? toYmd(addDays(lastPeriodDate, predictedCycleLength))
  const ovulationDate = mlPrediction?.ovulationDate ?? toYmd(addDays(fromYmd(predictedPeriodDate), -14))
  const fertileWindowStart = mlPrediction?.fertileWindowStart ?? toYmd(addDays(fromYmd(ovulationDate), -2))
  const fertileWindowEnd = mlPrediction?.fertileWindowEnd ?? toYmd(addDays(fromYmd(ovulationDate), 2))

  const confidenceBase = mlPrediction?.confidence ?? confidenceFromData(cycleLengths.length, stdDev)
  const confidence = Math.max(0.3, Math.min(0.95, confidenceBase))

  const plusMinusDays = mlPrediction?.confidenceRangeDays ?? computePredictionRangeDays(stdDev, cycleLengths.length)
  const predictionRangeEarliest = toYmd(addDays(fromYmd(predictedPeriodDate), -plusMinusDays))
  const predictionRangeLatest = toYmd(addDays(fromYmd(predictedPeriodDate), plusMinusDays))

  const timeline = buildTimeline({
    cycleStarts,
    predictedCycleLength,
    predictedPeriodDate,
  })

  const calendarPhases = buildCalendarPhases({
    cycleStarts,
    predictedCycleLength,
    fromDate: addDays(new Date(), -120),
    toDate: addDays(new Date(), 180),
  })

  const explanation = includeExplanation
    ? await buildGroqExplanation({
        cycleLength: predictedCycleLength,
        lastPeriod: toYmd(lastPeriodDate),
        predictedPeriodDate,
        ovulationDate,
        variation: Number(stdDev.toFixed(2)),
        isIrregular,
      })
    : ''

  if (persist) {
    await prisma.$transaction(async (tx) => {
      await tx.prediction.deleteMany({ where: { userId } })
      await tx.prediction.create({
        data: {
          userId,
          predictedPeriodDate: fromYmd(predictedPeriodDate),
          ovulationDate: fromYmd(ovulationDate),
          fertileWindowStart: fromYmd(fertileWindowStart),
          fertileWindowEnd: fromYmd(fertileWindowEnd),
          confidence,
          method,
        },
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          cycleLength: predictedCycleLength,
          periodDuration: fallbackPeriodDuration,
        },
      })
    })
  }

  return {
    predictedPeriodDate,
    predictedCycleLength,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    confidence,
    method,
    explanation,
    cycleStarts,
    cycleLengths,
    periodDurations,
    irregularity: {
      standardDeviation: Number(stdDev.toFixed(2)),
      isIrregular,
    },
    predictionRange: {
      earliest: predictionRangeEarliest,
      latest: predictionRangeLatest,
      plusMinusDays,
    },
    timeline,
    calendarPhases,
  }
}

async function getMlPrediction(payload: {
  userId: string
  cycleStarts: string[]
  cycleLengths: number[]
  periodDurations: number[]
  lastPeriodDate: Date
  avgCycleLength: number
  cycleLengthStd: number
  recentCycleLengths: number[]
  gapsBetweenCycles: number[]
}): Promise<
  | {
      predictedCycleLength: number
      predictedPeriodDate: string
      ovulationDate: string
      fertileWindowStart: string
      fertileWindowEnd: string
      confidence: number
      confidenceRangeDays: number
      method: PredictionMethod
    }
  | null
> {
  const mlServiceUrl = process.env.ML_SERVICE_URL?.trim()
  if (!mlServiceUrl) {
    return null
  }

  try {
    const response = await fetch(`${mlServiceUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: payload.userId,
        cycle_start_dates: payload.cycleStarts,
        cycle_lengths: payload.cycleLengths,
        period_durations: payload.periodDurations,
        last_period_date: toYmd(payload.lastPeriodDate),
        avg_cycle_length: payload.avgCycleLength,
        cycle_length_std: payload.cycleLengthStd,
        recent_cycle_lengths: payload.recentCycleLengths,
        gaps_between_cycles: payload.gapsBetweenCycles,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as MlServiceResponse

    const predictedCycleLength = clampCycleLength(
      data.predicted_cycle_length ?? data.predictedPeriodCycleLength ?? DEFAULT_CYCLE_LENGTH
    )

    const predictedPeriodDate = data.predicted_period_date ?? data.predictedPeriodDate
    const ovulationDate = data.ovulation_date ?? data.ovulationDate
    const fertileWindowStart = data.fertile_window_start ?? data.fertileWindowStart
    const fertileWindowEnd = data.fertile_window_end ?? data.fertileWindowEnd

    if (!predictedPeriodDate || !ovulationDate || !fertileWindowStart || !fertileWindowEnd) {
      return null
    }

    const method = normalizeMethod(data.method)

    return {
      predictedCycleLength,
      predictedPeriodDate,
      ovulationDate,
      fertileWindowStart,
      fertileWindowEnd,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.6,
      confidenceRangeDays: typeof data.confidence_range_days === 'number' ? data.confidence_range_days : 3.0,
      method,
    }
  } catch {
    return null
  }
}

async function buildGroqExplanation(input: {
  cycleLength: number
  lastPeriod: string
  predictedPeriodDate: string
  ovulationDate: string
  variation: number
  isIrregular: boolean
}): Promise<string> {
  const fallback = fallbackExplanation(input)

  if (!groqClient) {
    return fallback
  }

  const prompt = [
    'You are a menstrual health assistant.',
    '',
    'User data:',
    `- Cycle length: ${input.cycleLength}`,
    `- Last period: ${input.lastPeriod}`,
    `- Predicted next period: ${input.predictedPeriodDate}`,
    `- Ovulation: ${input.ovulationDate}`,
    `- Variation: ${input.variation}`,
    '',
    'Explain in simple, short language (2-3 lines):',
    '- When next period is expected',
    '- Whether it is early/late/normal',
    '- Possible reason (stress, hormones, irregular cycle)',
    '',
    'Do NOT give medical diagnosis.',
    'Be clear and helpful.',
  ].join('\n')

  try {
    const completion = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: 'Respond in plain text only. Keep it to 2-3 short sentences without diagnosis.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const text = completion.choices[0]?.message?.content?.trim()
    return text || fallback
  } catch {
    return fallback
  }
}

function fallbackExplanation(input: { predictedPeriodDate: string; variation: number; isIrregular: boolean }) {
  if (input.isIrregular) {
    return `Your next period is expected around ${input.predictedPeriodDate}. Because your cycle has higher variation, a shift of a few days is normal and can happen due to stress, sleep changes, or hormone fluctuations.`
  }

  return `Your next period is expected around ${input.predictedPeriodDate}. Your recent pattern looks fairly stable, but a small shift of 1-3 days can still happen with stress, travel, or routine changes.`
}

function buildTimeline(input: {
  cycleStarts: string[]
  predictedCycleLength: number
  predictedPeriodDate: string
}): HybridPredictionResponse['timeline'] {
  const today = toDayStart(new Date())
  const sortedStarts = normalizeStarts(input.cycleStarts)

  const currentStart = findCurrentStart(sortedStarts, today, input.predictedCycleLength)
  const currentDay = Math.max(1, dayDiff(currentStart, today) + 1)

  const pastCycles = sortedStarts
    .slice(-6)
    .map((startDate) => ({
      startDate: toYmd(startDate),
      source: 'actual' as const,
    }))

  if (pastCycles.length < 3) {
    let cursor = currentStart
    while (pastCycles.length < 3) {
      cursor = addDays(cursor, -input.predictedCycleLength)
      pastCycles.unshift({
        startDate: toYmd(cursor),
        source: 'inferred',
      })
    }
  }

  const futureCycles = [] as HybridPredictionResponse['timeline']['futureCycles']
  let nextStart = fromYmd(input.predictedPeriodDate)

  for (let i = 0; i < 3; i++) {
    const ovulationDate = addDays(nextStart, input.predictedCycleLength - 14)
    futureCycles.push({
      startDate: toYmd(nextStart),
      ovulationDate: toYmd(ovulationDate),
      fertileWindowStart: toYmd(addDays(ovulationDate, -2)),
      fertileWindowEnd: toYmd(addDays(ovulationDate, 2)),
    })

    nextStart = addDays(nextStart, input.predictedCycleLength)
  }

  return {
    pastCycles,
    currentCycle: {
      startDate: toYmd(currentStart),
      dayOfCycle: currentDay,
      phase: phaseForDay(currentDay, input.predictedCycleLength),
      estimatedEndDate: toYmd(addDays(currentStart, input.predictedCycleLength - 1)),
    },
    futureCycles,
  }
}

function buildCalendarPhases(input: {
  cycleStarts: string[]
  predictedCycleLength: number
  fromDate: Date
  toDate: Date
}): HybridPredictionResponse['calendarPhases'] {
  const today = toDayStart(new Date())
  const starts = expandStartsForRange(
    normalizeStarts(input.cycleStarts),
    toDayStart(input.fromDate),
    toDayStart(input.toDate),
    input.predictedCycleLength
  )

  const days: HybridPredictionResponse['calendarPhases'] = []
  let cursor = toDayStart(input.fromDate)

  while (cursor <= input.toDate) {
    const anchor = findLatestStart(starts, cursor)
    const dayOfCycle = Math.max(1, dayDiff(anchor, cursor) + 1)
    days.push({
      date: toYmd(cursor),
      dayOfCycle,
      phase: phaseForDay(dayOfCycle, input.predictedCycleLength),
      source: cursor <= today ? 'historical' : 'predicted',
    })

    cursor = addDays(cursor, 1)
  }

  return days
}

function normalizeMethod(raw?: string): PredictionMethod {
  if (raw === 'ml' || raw === 'ml_personalized' || raw === 'rule_based' || raw === 'statistical') {
    return raw
  }
  return 'ml'
}

function confidenceFromData(numCycles: number, stdDev: number) {
  const base = 0.45 + Math.min(0.35, numCycles * 0.05)
  const variancePenalty = Math.min(0.3, stdDev / 15)
  return base - variancePenalty
}

function computePredictionRangeDays(stdDev: number, numCycles: number) {
  if (numCycles <= 1) return 5
  if (stdDev <= 1.5) return 2
  if (stdDev <= 3) return 3
  if (stdDev <= 5) return 4
  return 6
}

function weightedAverage(lengths: number[], fallback: number) {
  if (lengths.length === 0) return fallback
  const recent = lengths.slice(-6)
  const weights = recent.map((_, index) => index + 1)
  const weightedSum = recent.reduce((sum, value, index) => sum + value * weights[index], 0)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  return Math.round(weightedSum / weightTotal)
}

function mean(values: number[], fallback: number) {
  if (values.length === 0) return fallback
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0
  const avg = mean(values, values[0])
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function gaps(starts: string[]) {
  const sorted = normalizeStarts(starts)
  const values: number[] = []

  for (let i = 1; i < sorted.length; i++) {
    values.push(dayDiff(sorted[i - 1], sorted[i]))
  }

  return values
}

function normalizeStarts(starts: string[]) {
  const unique = new Set(starts)
  return Array.from(unique)
    .map((value) => fromYmd(value))
    .sort((a, b) => a.getTime() - b.getTime())
}

function getLastPeriodDate(cycleStarts: string[], cycleEntryDate?: Date | null) {
  if (cycleStarts.length > 0) {
    return fromYmd(cycleStarts[cycleStarts.length - 1])
  }

  if (cycleEntryDate) {
    return toDayStart(cycleEntryDate)
  }

  return addDays(toDayStart(new Date()), -14)
}

function findCurrentStart(starts: Date[], date: Date, cycleLength: number) {
  const latest = findLatestStart(starts, date)

  if (latest <= date) {
    return latest
  }

  return addDays(date, -Math.max(1, cycleLength - 1))
}

function findLatestStart(starts: Date[], date: Date) {
  if (starts.length === 0) {
    return addDays(date, -14)
  }

  let latest = starts[0]
  for (const start of starts) {
    if (start <= date) {
      latest = start
      continue
    }
    break
  }
  return latest
}

function expandStartsForRange(starts: Date[], fromDate: Date, toDate: Date, cycleLength: number) {
  const values = starts.length > 0 ? [...starts] : [addDays(toDayStart(new Date()), -14)]

  while (values[0] > fromDate) {
    values.unshift(addDays(values[0], -cycleLength))
  }

  while (values[values.length - 1] < toDate) {
    values.push(addDays(values[values.length - 1], cycleLength))
  }

  return values
}

function phaseForDay(dayOfCycle: number, cycleLength: number): Phase {
  const ovulationDay = Math.max(10, Math.floor(cycleLength / 2))

  if (dayOfCycle <= 5) {
    return 'period'
  }
  if (dayOfCycle < ovulationDay) {
    return 'follicular'
  }
  if (dayOfCycle === ovulationDay) {
    return 'ovulation'
  }
  return 'luteal'
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toDayStart(next)
}

function dayDiff(a: Date, b: Date) {
  return Math.round((toDayStart(b).getTime() - toDayStart(a).getTime()) / 86400000)
}

function clampCycleLength(value: number) {
  return Math.max(MIN_CYCLE_LENGTH, Math.min(MAX_CYCLE_LENGTH, Math.round(value)))
}

function clampPeriodDuration(value: number) {
  return Math.max(2, Math.min(10, Math.round(value)))
}

function toDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function fromYmd(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toYmd(date: Date) {
  const day = toDayStart(date)
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
