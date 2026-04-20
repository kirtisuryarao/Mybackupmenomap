import { prisma } from '@/lib/prisma'
import { predictNextPeriod } from '@/lib/services/cycleService'

export interface SafetyAlert {
  type: 'alert'
  message: string
  urgency: 'high'
  reason:
    | 'severe_pain'
    | 'heavy_bleeding'
    | 'missed_period_pregnancy_risk'
    | 'extreme_symptoms'
}

const severePainTerms = [
  'severe pain',
  'unbearable pain',
  'extreme cramp',
  'cannot stand pain',
  'sharp pelvic pain',
]

const heavyBleedingTerms = [
  'heavy bleeding',
  'soaking through',
  'filling pad every hour',
  'large blood clots',
  'bleeding nonstop',
]

const extremeSymptomTerms = [
  'fainting',
  'passed out',
  'dizzy all day',
  'chest pain',
  'shortness of breath',
  'fever 39',
  'high fever',
  'cannot keep fluids down',
]

const pregnancyRiskTerms = [
  'missed period',
  'late period',
  'pregnant',
  'pregnancy risk',
  'unprotected sex',
  'unprotected intercourse',
]

const symptomMaskTerms = [
  'cramps',
  'pain',
  'bleeding',
  'spotting',
  'nausea',
  'vomiting',
  'headache',
  'fatigue',
  'dizziness',
  'fainting',
  'pregnant',
  'pregnancy',
]

function includesAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function daysBetween(start: Date, end: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return Math.round((b - a) / 86400000)
}

export function maskSensitiveSymptoms(input: string): string {
  let output = input
  for (const term of symptomMaskTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi')
    output = output.replace(regex, '[symptom]')
  }
  return output
}

export async function detectRedFlags(userId: string, query: string): Promise<SafetyAlert | null> {
  const lowered = query.toLowerCase()

  if (includesAny(lowered, severePainTerms)) {
    return {
      type: 'alert',
      message: 'Your symptoms may require urgent medical attention. Please seek care promptly.',
      urgency: 'high',
      reason: 'severe_pain',
    }
  }

  if (includesAny(lowered, heavyBleedingTerms)) {
    return {
      type: 'alert',
      message: 'Heavy bleeding patterns can be serious. You should seek medical attention today.',
      urgency: 'high',
      reason: 'heavy_bleeding',
    }
  }

  if (includesAny(lowered, extremeSymptomTerms)) {
    return {
      type: 'alert',
      message: 'These symptoms may require urgent evaluation. You should seek medical attention now.',
      urgency: 'high',
      reason: 'extreme_symptoms',
    }
  }

  try {
    const [recentLogs, fertilitySignals, prediction] = await Promise.all([
      prisma.dailyLog.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7,
        select: { flow: true },
      }),
      prisma.fertilityLog.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 45,
        select: { intercourse: true },
      }),
      predictNextPeriod(userId).catch(() => null),
    ])

    const repeatedHeavyFlow = recentLogs.filter((log) => log.flow === 'heavy' || log.flow === 'super_heavy').length >= 3
    if (repeatedHeavyFlow) {
      return {
        type: 'alert',
        message: 'Recent heavy bleeding trends may need urgent care. Please seek medical attention.',
        urgency: 'high',
        reason: 'heavy_bleeding',
      }
    }

    const queryMentionsPregnancyRisk = includesAny(lowered, pregnancyRiskTerms)
    const hadRecentIntercourse = fertilitySignals.some((entry) => entry.intercourse)

    if (queryMentionsPregnancyRisk && hadRecentIntercourse && prediction?.nextPeriodDate) {
      const nextPeriodDate = new Date(`${prediction.nextPeriodDate}T00:00:00`)
      const overdueDays = daysBetween(nextPeriodDate, new Date())

      if (overdueDays >= 7) {
        return {
          type: 'alert',
          message: 'A missed period with possible pregnancy risk may need timely clinical guidance. You should seek medical attention.',
          urgency: 'high',
          reason: 'missed_period_pregnancy_risk',
        }
      }
    }
  } catch {
    // Fail closed to query-only safety checks without exposing internals.
  }

  return null
}
