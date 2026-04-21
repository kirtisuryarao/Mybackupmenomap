import { formatDate, parseDate } from '@/lib/cycle-calculations'

export type PartnerConsentScope = 'cycle' | 'symptoms' | 'mood' | 'notes'

export type PartnerPhase = 'Menstruation' | 'Follicular' | 'Ovulation' | 'Luteal'

export interface PartnerLogLike {
  id?: string
  date: Date | string
  flow?: string | null
  mood?: string[]
  symptoms?: string[]
  notes?: string | null
  sleepQuality?: string | null
}

export interface PartnerInsightsInput {
  userName: string
  lastPeriodDate: Date | string
  cycleLength: number
  periodLength?: number
  recentLogs?: PartnerLogLike[]
  consentScopes?: PartnerConsentScope[]
  today?: Date
}

export interface PartnerCalendarDay {
  date: string
  day: number
  cycleDay: number
  phase: PartnerPhase
  classification: 'period' | 'fertile' | 'ovulation' | 'safe'
  label: string
  explanation: string
  isToday: boolean
}

export interface PartnerSupportScore {
  support_score: number
  status: string
  tips_followed: number
}

export interface PartnerInsights {
  current_day: number
  phase: PartnerPhase
  fertility_status: 'High' | 'Medium' | 'Low'
  fertility_probability: 'High' | 'Medium' | 'Low'
  is_safe_day: boolean
  is_fertile: boolean
  is_ovulation: boolean
  next_period_date: string
  days_to_next_period: number
  ovulation_day: number
  ovulation_date: string
  fertile_window: [number, number]
  energy_level: string
  mood_tendency: string
  support_advice: string
  support_actions: string[]
  warnings: string[]
  alerts: string[]
  relationship_insights: string[]
  pattern_insights: string[]
  support_score: PartnerSupportScore
  calendar: PartnerCalendarDay[]
  visible_data: {
    mood: boolean
    symptoms: boolean
    notes: boolean
  }
  recent_signals: {
    moods: string[]
    symptoms: string[]
    notes_preview: string[]
  }
}

const DAY_MS = 86_400_000

export const phaseInsights: Record<Lowercase<PartnerPhase>, { energy: string; mood: string; advice: string }> = {
  menstruation: {
    energy: 'Low',
    mood: 'Sensitive',
    advice: 'Offer care, warmth, and rest support.',
  },
  follicular: {
    energy: 'High',
    mood: 'Positive',
    advice: 'Great time for planning activities and positive connection.',
  },
  ovulation: {
    energy: 'Peak',
    mood: 'Confident',
    advice: 'Social energy is high. Lean into quality time and communication.',
  },
  luteal: {
    energy: 'Dropping',
    mood: 'Irritable',
    advice: 'Be patient, avoid conflict, and focus on emotional safety.',
  },
}

const phaseActions: Record<Lowercase<PartnerPhase>, string[]> = {
  menstruation: [
    'Bring comfort: warm food, water, or a heating pad.',
    'Reduce pressure and help with practical tasks.',
    'Check in gently without forcing conversation.',
  ],
  follicular: [
    'Plan a light activity or date together.',
    'Use this window for planning and decision-making.',
    'Encourage momentum and celebrate progress.',
  ],
  ovulation: [
    'Make time for quality connection and social plans.',
    'Use today for important conversations if needed.',
    'Stay present and appreciative of her energy.',
  ],
  luteal: [
    'Avoid arguments today and respond with patience.',
    'Check in emotionally before offering solutions.',
    'Give space if needed and support rest routines.',
  ],
}

function atStartOfDay(input: Date | string): Date {
  const date = typeof input === 'string' ? parseDate(input.slice(0, 10)) : new Date(input)
  date.setHours(0, 0, 0, 0)
  return date
}

function diffDays(start: Date, end: Date): number {
  return Math.round((atStartOfDay(end).getTime() - atStartOfDay(start).getTime()) / DAY_MS)
}

function clampCycleLength(value: number): number {
  return Math.max(21, Math.min(60, Math.round(value || 28)))
}

function clampPeriodLength(periodLength: number | undefined, cycleLength: number): number {
  return Math.max(2, Math.min(Math.round(periodLength || 5), cycleLength - 10))
}

function getCurrentCycleAnchor(lastPeriodDate: Date, cycleLength: number, today: Date) {
  const daysSinceStart = diffDays(lastPeriodDate, today)
  const cyclesElapsed = Math.max(0, Math.floor(daysSinceStart / cycleLength))
  const cycleStart = new Date(lastPeriodDate)
  cycleStart.setDate(cycleStart.getDate() + cyclesElapsed * cycleLength)
  cycleStart.setHours(0, 0, 0, 0)

  const currentDay = diffDays(cycleStart, today) + 1
  return {
    cycleStart,
    currentDay: Math.max(1, Math.min(cycleLength, currentDay)),
  }
}

function getPhase(day: number, periodLength: number, ovulationDay: number): PartnerPhase {
  if (day <= periodLength) return 'Menstruation'
  if (day < ovulationDay) return 'Follicular'
  if (day === ovulationDay) return 'Ovulation'
  return 'Luteal'
}

function summarizeCounts(values: string[]): string[] {
  const counts = new Map<string, number>()

  for (const value of values) {
    const key = value.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([value]) => value)
}

function deriveMoodTendency(phase: PartnerPhase, logs: PartnerLogLike[], canViewMood: boolean): string {
  if (!canViewMood) return phaseInsights[phase.toLowerCase() as Lowercase<PartnerPhase>].mood

  const recentMoods = summarizeCounts(logs.flatMap((log) => log.mood || []))
  return recentMoods[0] || phaseInsights[phase.toLowerCase() as Lowercase<PartnerPhase>].mood
}

function deriveEnergyLevel(phase: PartnerPhase, logs: PartnerLogLike[], canViewSymptoms: boolean): string {
  const defaultEnergy = phaseInsights[phase.toLowerCase() as Lowercase<PartnerPhase>].energy
  if (!canViewSymptoms) return defaultEnergy

  const symptoms = logs.flatMap((log) => log.symptoms || []).map((entry) => entry.toLowerCase())
  if (symptoms.some((symptom) => ['fatigue', 'exhaustion', 'low energy'].includes(symptom))) {
    return phase === 'Follicular' || phase === 'Ovulation' ? 'Moderate' : 'Low'
  }
  if (symptoms.some((symptom) => ['cramps', 'bloating', 'headache'].includes(symptom)) && phase !== 'Follicular') {
    return 'Low'
  }
  return defaultEnergy
}

function buildWarnings(phase: PartnerPhase, logs: PartnerLogLike[], canViewSymptoms: boolean): string[] {
  const warnings = new Set<string>()

  if (phase === 'Luteal') warnings.add('Emotional sensitivity likely')
  if (phase === 'Menstruation') warnings.add('Physical discomfort may be higher today')

  if (canViewSymptoms) {
    const symptoms = logs.flatMap((log) => log.symptoms || []).map((entry) => entry.toLowerCase())
    if (symptoms.includes('cramps')) warnings.add('Cramps may affect comfort and patience')
    if (symptoms.includes('headache')) warnings.add('Reduce sensory overload when possible')
    if (symptoms.includes('fatigue')) warnings.add('Energy may be limited even for simple plans')
  }

  return [...warnings]
}

function buildAlerts(currentDay: number, ovulationDay: number, fertileWindow: [number, number], daysToNextPeriod: number): string[] {
  const alerts: string[] = []

  if (daysToNextPeriod === 1) alerts.push('Period starting tomorrow')
  if (daysToNextPeriod === 0) alerts.push('Period expected today')

  const daysToOvulation = ovulationDay - currentDay
  if (daysToOvulation === 2) alerts.push('Ovulation in 2 days')
  if (daysToOvulation === 1) alerts.push('Ovulation tomorrow')

  if (currentDay === fertileWindow[0]) alerts.push('Fertile window begins today')
  if (currentDay === fertileWindow[1]) alerts.push('Fertile window ends today')

  return alerts
}

function buildRelationshipInsights(phase: PartnerPhase, currentDay: number, ovulationDay: number, daysToNextPeriod: number): string[] {
  const insights: string[] = []

  if (phase === 'Follicular') insights.push('Best time for date night planning and shared activities.')
  if (phase === 'Ovulation') insights.push('High energy window is here. Great day for connection and quality time.')
  if (phase === 'Luteal') insights.push('Emotional phase ahead. Keep plans simple and communication gentle.')
  if (daysToNextPeriod <= 3) insights.push('Period is close. Comfort-focused support will likely matter more.')
  if (currentDay < ovulationDay && ovulationDay - currentDay <= 4) insights.push('High energy window coming soon.')

  return insights.slice(0, 3)
}

function buildPatternInsights(logs: PartnerLogLike[], cycleLength: number, periodLength: number): string[] {
  if (logs.length === 0) {
    return ['More logged mood and symptom data will unlock smarter partner patterns.']
  }

  const normalized = logs.map((log) => ({
    ...log,
    parsedDate: atStartOfDay(log.date),
  }))

  const lateLutealMoods: string[] = []
  const lateLutealSymptoms: string[] = []
  const earlyPeriodSymptoms: string[] = []

  for (const log of normalized) {
    const dayOffset = diffDays(normalized[normalized.length - 1].parsedDate, log.parsedDate)
    void dayOffset
  }

  for (const log of normalized) {
    const date = log.parsedDate
    const syntheticAnchor = new Date(date)
    syntheticAnchor.setDate(syntheticAnchor.getDate() - ((date.getDate() + cycleLength) % cycleLength))
    const cycleDay = ((Math.max(0, date.getDate() - syntheticAnchor.getDate()) % cycleLength) + cycleLength) % cycleLength + 1

    if (cycleDay >= cycleLength - 2) {
      lateLutealMoods.push(...(log.mood || []))
      lateLutealSymptoms.push(...(log.symptoms || []))
    }

    if (cycleDay <= periodLength + 1) {
      earlyPeriodSymptoms.push(...(log.symptoms || []))
    }
  }

  const patterns: string[] = []
  const topLateMood = summarizeCounts(lateLutealMoods)[0]
  const topLutealSymptom = summarizeCounts(lateLutealSymptoms)[0]
  const topPeriodSymptom = summarizeCounts(earlyPeriodSymptoms)[0]

  if (topLateMood) patterns.push(`She usually feels ${topLateMood.toLowerCase()} close to her next period.`)
  if (topLutealSymptom) patterns.push(`${capitalize(topLutealSymptom)} tends to appear in the late luteal phase.`)
  if (topPeriodSymptom) patterns.push(`${capitalize(topPeriodSymptom)} often shows up around period start.`)

  return patterns.length > 0
    ? patterns.slice(0, 3)
    : ['Patterns will become sharper as more daily logs are added.']
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function buildCalendar(cycleStart: Date, cycleLength: number, periodLength: number, ovulationDay: number, fertileWindow: [number, number], today: Date): PartnerCalendarDay[] {
  const days: PartnerCalendarDay[] = []

  for (let day = 1; day <= cycleLength; day++) {
    const date = new Date(cycleStart)
    date.setDate(cycleStart.getDate() + (day - 1))

    const phase = getPhase(day, periodLength, ovulationDay)
    let classification: PartnerCalendarDay['classification'] = 'safe'
    let label = 'Safe'

    if (day <= periodLength) {
      classification = 'period'
      label = 'Period'
    } else if (day === ovulationDay) {
      classification = 'ovulation'
      label = 'Ovulation'
    } else if (day >= fertileWindow[0] && day <= fertileWindow[1]) {
      classification = 'fertile'
      label = 'Fertile'
    }

    days.push({
      date: formatDate(date),
      day,
      cycleDay: day,
      phase,
      classification,
      label,
      explanation: `${label} phase on cycle day ${day}. ${phaseInsights[phase.toLowerCase() as Lowercase<PartnerPhase>].advice}`,
      isToday: formatDate(date) === formatDate(today),
    })
  }

  return days
}

export function getPartnerInsights(input: PartnerInsightsInput): PartnerInsights {
  const today = atStartOfDay(input.today || new Date())
  const cycleLength = clampCycleLength(input.cycleLength)
  const periodLength = clampPeriodLength(input.periodLength, cycleLength)
  const consentScopes = new Set<PartnerConsentScope>(input.consentScopes || ['cycle'])
  const logs = (input.recentLogs || []).map((log) => ({
    ...log,
    date: atStartOfDay(log.date),
  }))
  const lastPeriodDate = atStartOfDay(input.lastPeriodDate)

  const { cycleStart, currentDay } = getCurrentCycleAnchor(lastPeriodDate, cycleLength, today)
  const ovulationDay = Math.max(periodLength + 1, cycleLength - 14)
  const fertileWindow: [number, number] = [Math.max(1, ovulationDay - 5), Math.min(cycleLength, ovulationDay + 1)]
  const isOvulation = currentDay === ovulationDay
  const isFertile = currentDay >= fertileWindow[0] && currentDay <= fertileWindow[1]
  const phase = getPhase(currentDay, periodLength, ovulationDay)

  const nextPeriodDate = new Date(cycleStart)
  nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength)

  const ovulationDate = new Date(cycleStart)
  ovulationDate.setDate(ovulationDate.getDate() + ovulationDay - 1)

  const daysToNextPeriod = diffDays(today, nextPeriodDate)
  const fertilityProbability: PartnerInsights['fertility_probability'] = isOvulation
    ? 'High'
    : isFertile
      ? currentDay <= ovulationDay ? 'High' : 'Medium'
      : Math.abs(currentDay - fertileWindow[0]) <= 2 || Math.abs(currentDay - fertileWindow[1]) <= 2
        ? 'Medium'
        : 'Low'

  const phaseKey = phase.toLowerCase() as Lowercase<PartnerPhase>
  const moodTendency = deriveMoodTendency(phase, logs, consentScopes.has('mood'))
  const energyLevel = deriveEnergyLevel(phase, logs, consentScopes.has('symptoms'))
  const supportActions = phaseActions[phaseKey]
  const supportAdvice = supportActions[0] || phaseInsights[phaseKey].advice
  const warnings = buildWarnings(phase, logs, consentScopes.has('symptoms'))
  const alerts = buildAlerts(currentDay, ovulationDay, fertileWindow, daysToNextPeriod)
  const relationshipInsights = buildRelationshipInsights(phase, currentDay, ovulationDay, daysToNextPeriod)
  const patternInsights = buildPatternInsights(logs, cycleLength, periodLength)
  const visibleMood = consentScopes.has('mood')
  const visibleSymptoms = consentScopes.has('symptoms')
  const visibleNotes = consentScopes.has('notes')

  const visibleSignals = {
    moods: visibleMood ? summarizeCounts(logs.flatMap((log) => log.mood || [])) : [],
    symptoms: visibleSymptoms ? summarizeCounts(logs.flatMap((log) => log.symptoms || [])) : [],
    notes_preview: visibleNotes
      ? logs
          .map((log) => (typeof log.notes === 'string' ? log.notes.trim() : ''))
          .filter(Boolean)
          .slice(0, 2)
      : [],
  }

  const sharedSignalScore = [visibleMood, visibleSymptoms, visibleNotes].filter(Boolean).length * 8
  const dataDepthScore = Math.min(24, logs.length * 2)
  const supportScoreValue = Math.min(95, 45 + sharedSignalScore + dataDepthScore)

  return {
    current_day: currentDay,
    phase,
    fertility_status: fertilityProbability,
    fertility_probability: fertilityProbability,
    is_safe_day: !isFertile,
    is_fertile: isFertile,
    is_ovulation: isOvulation,
    next_period_date: formatDate(nextPeriodDate),
    days_to_next_period: Math.max(0, daysToNextPeriod),
    ovulation_day: ovulationDay,
    ovulation_date: formatDate(ovulationDate),
    fertile_window: fertileWindow,
    energy_level: energyLevel,
    mood_tendency: moodTendency,
    support_advice: supportAdvice,
    support_actions: supportActions,
    warnings,
    alerts,
    relationship_insights: relationshipInsights,
    pattern_insights: patternInsights,
    support_score: {
      support_score: supportScoreValue,
      status: supportScoreValue >= 85 ? 'Supportive Partner' : supportScoreValue >= 70 ? 'Attentive Partner' : 'Learning Partner',
      tips_followed: Math.min(6, supportActions.length),
    },
    calendar: buildCalendar(cycleStart, cycleLength, periodLength, ovulationDay, fertileWindow, today),
    visible_data: {
      mood: visibleMood,
      symptoms: visibleSymptoms,
      notes: visibleNotes,
    },
    recent_signals: visibleSignals,
  }
}