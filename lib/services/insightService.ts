import { prisma } from '@/lib/prisma'

export interface HealthInsight {
  insight: string
  severity: 'low' | 'moderate' | 'high'
  recommendation: string
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

async function getRecentCycleLengths(userId: string): Promise<number[]> {
  const cycles = await prisma.cycle.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
    take: 6,
    select: { cycleLength: true },
  })

  return cycles.map((cycle) => cycle.cycleLength)
}

async function getRecentSymptomSeverity(userId: string): Promise<number[]> {
  const symptoms = await prisma.symptomLog.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
    select: { severity: true },
  })

  return symptoms.map((entry) => entry.severity)
}

export async function getHealthInsights(userId: string): Promise<HealthInsight[]> {
  const [cycleLengths, severityValues] = await Promise.all([
    getRecentCycleLengths(userId),
    getRecentSymptomSeverity(userId),
  ])

  const insights: HealthInsight[] = []

  const longCycleCount = cycleLengths.filter((length) => length > 35).length
  const hasConsistentLongCycles = cycleLengths.length >= 3 && longCycleCount >= Math.ceil(cycleLengths.length * 0.6)

  if (hasConsistentLongCycles) {
    insights.push({
      insight: 'Patterns suggest consistently longer cycle lengths over recent cycles.',
      severity: 'moderate',
      recommendation: 'You may consider consulting a clinician for cycle pattern review.',
    })
  }

  const averageSeverity = average(severityValues)
  const highSymptomBurden = severityValues.length >= 5 && averageSeverity >= 4

  if (highSymptomBurden && hasConsistentLongCycles) {
    insights.push({
      insight: 'Patterns suggest higher symptom burden alongside irregular cycle timing.',
      severity: 'high',
      recommendation: 'You may consider consulting a gynecologist for personalized evaluation.',
    })
  } else if (highSymptomBurden) {
    insights.push({
      insight: 'Patterns suggest moderate-to-high symptom severity in recent logs.',
      severity: 'moderate',
      recommendation: 'You may consider discussing symptom management options with a clinician.',
    })
  }

  if (insights.length === 0) {
    insights.push({
      insight: 'No high-risk pattern is currently detected from recent logs.',
      severity: 'low',
      recommendation: 'Continue consistent tracking to improve future insight quality.',
    })
  }

  return insights
}
