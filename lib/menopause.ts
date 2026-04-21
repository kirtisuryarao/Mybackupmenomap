export const MENOPAUSE_STAGES = ['regular', 'irregular', 'perimenopause', 'menopause'] as const

export type MenopauseStage = (typeof MENOPAUSE_STAGES)[number]

export interface SymptomInsight {
  key: 'fatigue' | 'hot_flashes' | 'mood_swings'
  title: string
  message: string
  confidence: 'watch' | 'likely'
}

export interface SymptomSummary {
  averageSleepHours: number | null
  recurringSymptoms: string[]
  moodSignals: string[]
}

interface InsightLog {
  symptoms: unknown
  mood?: string | null
  sleepHours?: number | null
}

const MOOD_SIGNAL_TERMS = ['anxious', 'irritable', 'angry', 'sad', 'mood swings', 'sensitive']
const HOT_FLASH_TERMS = ['hot flashes', 'hot flash', 'night sweats']
const FATIGUE_TERMS = ['fatigue', 'exhaustion', 'low energy']

export function isMenopauseMode(stage?: string | null): stage is 'perimenopause' | 'menopause' {
  return stage === 'perimenopause' || stage === 'menopause'
}

export function normalizeSymptoms(symptoms: unknown): string[] {
  if (Array.isArray(symptoms)) {
    return symptoms.filter((value): value is string => typeof value === 'string')
  }

  return []
}

export function summarizeSymptoms(logs: InsightLog[]): SymptomSummary {
  const recentLogs = logs.slice(0, 7)
  const sleepValues = recentLogs
    .map((log) => log.sleepHours)
    .filter((value): value is number => typeof value === 'number' && value > 0)

  const symptomCounts = new Map<string, number>()
  const moodSignals = new Set<string>()

  for (const log of recentLogs) {
    for (const symptom of normalizeSymptoms(log.symptoms)) {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1)
    }

    if (log.mood) {
      const normalizedMood = log.mood.toLowerCase()
      if (MOOD_SIGNAL_TERMS.some((term) => normalizedMood.includes(term))) {
        moodSignals.add(log.mood)
      }
    }
  }

  return {
    averageSleepHours: sleepValues.length
      ? Number((sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length).toFixed(1))
      : null,
    recurringSymptoms: Array.from(symptomCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([symptom]) => symptom)
      .slice(0, 4),
    moodSignals: Array.from(moodSignals).slice(0, 4),
  }
}

export function buildSymptomInsights(logs: InsightLog[]): SymptomInsight[] {
  const recentLogs = logs.slice(0, 7)
  const insights: SymptomInsight[] = []

  const hotFlashCount = recentLogs.filter((log) =>
    normalizeSymptoms(log.symptoms).some((symptom) => HOT_FLASH_TERMS.includes(symptom.toLowerCase()))
  ).length

  if (hotFlashCount >= 2) {
    insights.push({
      key: 'hot_flashes',
      title: 'Hot flashes likely based on recent trends',
      message: 'You have logged repeated hot flash patterns recently. Keep hydration and cooling strategies ready tomorrow.',
      confidence: hotFlashCount >= 3 ? 'likely' : 'watch',
    })
  }

  const lowSleepCount = recentLogs.filter((log) => typeof log.sleepHours === 'number' && log.sleepHours < 6.5).length
  const fatigueCount = recentLogs.filter((log) =>
    normalizeSymptoms(log.symptoms).some((symptom) => FATIGUE_TERMS.includes(symptom.toLowerCase()))
  ).length

  if (fatigueCount >= 2 || (lowSleepCount >= 2 && fatigueCount >= 1)) {
    insights.push({
      key: 'fatigue',
      title: 'You may experience fatigue tomorrow',
      message: 'Recent fatigue symptoms combined with lighter sleep suggest you may want a lower-demand day and earlier rest window.',
      confidence: fatigueCount >= 3 || lowSleepCount >= 3 ? 'likely' : 'watch',
    })
  }

  const moodSignalCount = recentLogs.filter((log) => {
    const normalizedMood = log.mood?.toLowerCase() || ''
    return MOOD_SIGNAL_TERMS.some((term) => normalizedMood.includes(term))
  }).length

  if (moodSignalCount >= 2) {
    insights.push({
      key: 'mood_swings',
      title: 'Mood swings may need extra support',
      message: 'Recent mood changes suggest tomorrow may feel more sensitive. Build in recovery time and lighter commitments where possible.',
      confidence: moodSignalCount >= 3 ? 'likely' : 'watch',
    })
  }

  return insights.slice(0, 3)
}

export function buildAlertMessage(insights: SymptomInsight[], summary: SymptomSummary): string | null {
  if (insights.length === 0) {
    return null
  }

  if (summary.averageSleepHours !== null && summary.averageSleepHours < 6.5) {
    return 'Based on your recent sleep and symptoms, you may experience discomfort tomorrow.'
  }

  return insights[0]?.message || null
}