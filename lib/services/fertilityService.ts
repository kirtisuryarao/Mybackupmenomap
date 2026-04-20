import { prisma } from '@/lib/prisma'
import { predictNextPeriod } from '@/lib/services/cycleService'

const FERTILE_WINDOW_RADIUS_DAYS = 2
const OVULATION_TEST_OFFSET_DAYS = 1
const BBT_RISE_THRESHOLD = 0.2

type NullableDate = Date | null

export interface FertilityLogInput {
  date: string
  basalTemp?: number
  cervicalMucus?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white'
  ovulationTest?: boolean
  intercourse?: boolean
}

export interface FertilityInsight {
  date: string
  estimatedOvulationDate: string | null
  fertileWindow: { startDate: string; endDate: string } | null
  confidence: 'low' | 'medium' | 'high'
  signals: {
    ovulationTestPositive: boolean
    basalTempRiseDetected: boolean
  }
  notes: string[]
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

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return toDayStart(copy)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function pickEarlierDate(a: NullableDate, b: NullableDate): NullableDate {
  if (!a) return b
  if (!b) return a
  return a.getTime() <= b.getTime() ? a : b
}

function detectBbtRiseDate(logs: { date: Date; basalTemp: number | null }[]): NullableDate {
  const tempLogs = logs.filter((entry) => entry.basalTemp !== null) as { date: Date; basalTemp: number }[]

  if (tempLogs.length < 8) return null

  for (let i = 6; i + 2 < tempLogs.length; i += 1) {
    const baselineTemps = tempLogs.slice(i - 6, i).map((entry) => entry.basalTemp)
    const riseTemps = tempLogs.slice(i, i + 3).map((entry) => entry.basalTemp)

    const baselineAvg = average(baselineTemps)
    const riseAvg = average(riseTemps)

    if (riseAvg - baselineAvg >= BBT_RISE_THRESHOLD) {
      return tempLogs[i].date
    }
  }

  return null
}

function toFertileWindow(ovulationDate: Date | null): { startDate: string; endDate: string } | null {
  if (!ovulationDate) return null
  return {
    startDate: formatYmd(addDays(ovulationDate, -FERTILE_WINDOW_RADIUS_DAYS)),
    endDate: formatYmd(addDays(ovulationDate, FERTILE_WINDOW_RADIUS_DAYS)),
  }
}

export async function logFertilityData(userId: string, input: FertilityLogInput) {
  const date = parseYmd(input.date)

  return prisma.fertilityLog.upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    create: {
      userId,
      date,
      basalTemp: input.basalTemp,
      cervicalMucus: input.cervicalMucus,
      ovulationTest: input.ovulationTest,
      intercourse: input.intercourse,
    },
    update: {
      basalTemp: input.basalTemp,
      cervicalMucus: input.cervicalMucus,
      ovulationTest: input.ovulationTest,
      intercourse: input.intercourse,
    },
    select: {
      id: true,
      date: true,
      basalTemp: true,
      cervicalMucus: true,
      ovulationTest: true,
      intercourse: true,
      createdAt: true,
    },
  })
}

export async function refineOvulationPrediction(userId: string, referenceDate?: string) {
  const refDate = referenceDate ? parseYmd(referenceDate) : toDayStart(new Date())
  const startWindow = addDays(refDate, -60)

  const [cyclePrediction, fertilityLogs] = await Promise.all([
    predictNextPeriod(userId, referenceDate),
    prisma.fertilityLog.findMany({
      where: {
        userId,
        date: { gte: startWindow, lte: refDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        basalTemp: true,
        ovulationTest: true,
      },
    }),
  ])

  const latestPositiveOvulationTest = [...fertilityLogs]
    .reverse()
    .find((entry) => entry.ovulationTest === true)

  const ovulationFromTest = latestPositiveOvulationTest
    ? addDays(latestPositiveOvulationTest.date, OVULATION_TEST_OFFSET_DAYS)
    : null

  const bbtRiseDate = detectBbtRiseDate(fertilityLogs)
  const ovulationFromBbt = bbtRiseDate ? addDays(bbtRiseDate, -1) : null

  const cycleBasedDate = cyclePrediction?.ovulationWindow
    ? parseYmd(cyclePrediction.ovulationWindow.ovulationDate)
    : null

  let refinedOvulationDate = pickEarlierDate(ovulationFromTest, ovulationFromBbt)
  if (!refinedOvulationDate) {
    refinedOvulationDate = cycleBasedDate
  }

  const signalCount = [ovulationFromTest, ovulationFromBbt].filter(Boolean).length
  const confidence: 'low' | 'medium' | 'high' =
    signalCount >= 2 ? 'high' : signalCount === 1 ? 'medium' : 'low'

  return {
    estimatedOvulationDate: refinedOvulationDate ? formatYmd(refinedOvulationDate) : null,
    fertileWindow: toFertileWindow(refinedOvulationDate),
    confidence,
    signals: {
      ovulationTestPositive: Boolean(latestPositiveOvulationTest),
      basalTempRiseDetected: Boolean(bbtRiseDate),
    },
  }
}

export async function getFertilityInsights(userId: string, referenceDate?: string): Promise<FertilityInsight> {
  const refDate = referenceDate ? parseYmd(referenceDate) : toDayStart(new Date())

  const [refinedPrediction, recentFertilityLogs] = await Promise.all([
    refineOvulationPrediction(userId, referenceDate),
    prisma.fertilityLog.findMany({
      where: {
        userId,
        date: { gte: addDays(refDate, -30), lte: refDate },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        cervicalMucus: true,
        ovulationTest: true,
        basalTemp: true,
      },
    }),
  ])

  const notes: string[] = []
  if (recentFertilityLogs.some((entry) => entry.cervicalMucus === 'egg_white')) {
    notes.push('Patterns suggest fertile-type cervical mucus in recent days.')
  }
  if (recentFertilityLogs.some((entry) => entry.ovulationTest)) {
    notes.push('Patterns suggest at least one positive ovulation test in the recent window.')
  }
  if (!recentFertilityLogs.some((entry) => entry.basalTemp !== null)) {
    notes.push('Consider logging daily basal temperature to improve ovulation timing accuracy.')
  }

  return {
    date: formatYmd(refDate),
    estimatedOvulationDate: refinedPrediction.estimatedOvulationDate,
    fertileWindow: refinedPrediction.fertileWindow,
    confidence: refinedPrediction.confidence,
    signals: refinedPrediction.signals,
    notes,
  }
}
