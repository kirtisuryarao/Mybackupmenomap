/**
 * Cycle Engine - Dynamic cycle detection, prediction, and analytics
 * 
 * Handles:
 * - Detecting cycle starts from daily logs (first day of period)
 * - Weighted average cycle length calculation (recent cycles weighted more)
 * - Rule-based prediction (next period, ovulation, fertile window)
 * - Irregular cycle detection
 * - Analytics computation (avg cycle length, variation, period duration)
 */

export interface CycleRecord {
  startDate: Date
  endDate?: Date | null
  length?: number | null
  periodLength?: number | null
}

export interface PredictionResult {
  predictedPeriodDate: Date
  ovulationDate: Date
  fertileWindowStart: Date
  fertileWindowEnd: Date
  confidence: number
  method: 'rule_based' | 'ml'
}

export interface AnalyticsResult {
  avgCycleLength: number
  cycleVariation: number // standard deviation
  avgPeriodLength: number
  totalCyclesTracked: number
  isIrregular: boolean
  irregularReason: string | null
  cycleLengths: number[]
  periodLengths: number[]
}

export interface DailyLogEntry {
  date: Date
  flow: string | null
  spotting: string | null
}

/**
 * Detect cycle starts from daily logs.
 * A cycle start = first day of period flow after a non-period gap.
 * Returns array of start dates sorted ascending.
 */
export function detectCycleStarts(logs: DailyLogEntry[]): Date[] {
  // Sort logs by date ascending
  const sorted = [...logs]
    .filter(l => l.flow !== null && l.flow !== '')
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (sorted.length === 0) return []

  const starts: Date[] = [sorted[0].date]
  
  for (let i = 1; i < sorted.length; i++) {
    const daysDiff = Math.floor(
      (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // If gap > 2 days between flow entries, it's a new cycle start
    if (daysDiff > 2) {
      starts.push(sorted[i].date)
    }
  }

  return starts
}

/**
 * Build cycle records from detected starts and daily logs.
 * Each cycle runs from one start to the day before the next start.
 */
export function buildCycleRecords(
  starts: Date[],
  logs: DailyLogEntry[]
): CycleRecord[] {
  if (starts.length === 0) return []

  const cycles: CycleRecord[] = []

  for (let i = 0; i < starts.length; i++) {
    const startDate = starts[i]
    const nextStart = i + 1 < starts.length ? starts[i + 1] : null
    
    let length: number | null = null
    let endDate: Date | null = null

    if (nextStart) {
      length = Math.floor(
        (nextStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      endDate = new Date(nextStart)
      endDate.setDate(endDate.getDate() - 1)
    }

    // Calculate period length (consecutive days of flow from start)
    const flowLogs = logs
      .filter(l => l.flow && l.flow !== '' && l.date >= startDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    let periodLength = 0
    if (flowLogs.length > 0) {
      periodLength = 1
      for (let j = 1; j < flowLogs.length; j++) {
        const diff = Math.floor(
          (flowLogs[j].date.getTime() - flowLogs[j - 1].date.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diff <= 2) { // Allow 1 day gap in period
          periodLength++
        } else {
          break
        }
      }
    }

    cycles.push({
      startDate,
      endDate,
      length,
      periodLength: periodLength || null,
    })
  }

  return cycles
}

/**
 * Calculate weighted average cycle length.
 * Recent cycles get higher weight (exponential decay).
 * Uses at most the last 6 cycles.
 */
export function weightedAverageCycleLength(cycles: CycleRecord[], maxCycles: number = 6): number {
  // Filter cycles with known lengths, take most recent
  const validCycles = cycles
    .filter(c => c.length !== null && c.length > 0 && c.length <= 60)
    .slice(-maxCycles)

  if (validCycles.length === 0) return 28 // Default

  // Weights: most recent cycle gets highest weight
  // e.g., for 3 cycles: weights = [1, 2, 3] (oldest to newest)
  const weights = validCycles.map((_, i) => i + 1)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const weightedSum = validCycles.reduce((sum, cycle, i) => {
    return sum + (cycle.length! * weights[i])
  }, 0)

  return Math.round(weightedSum / totalWeight)
}

/**
 * Calculate average period length from cycle records.
 */
export function averagePeriodLength(cycles: CycleRecord[]): number {
  const valid = cycles.filter(c => c.periodLength !== null && c.periodLength > 0)
  if (valid.length === 0) return 5 // Default

  const sum = valid.reduce((s, c) => s + c.periodLength!, 0)
  return Math.round(sum / valid.length)
}

/**
 * Generate prediction using rule-based logic.
 * - Next period = last_period_start + avg_cycle_length
 * - Ovulation = next_period - 14 days (luteal phase is ~14 days)
 * - Fertile window = ovulation ± 2 days
 */
export function predictNextCycle(
  lastCycleStart: Date,
  avgCycleLength: number,
  cycleCount: number
): PredictionResult {
  // Next period date
  const predictedPeriodDate = new Date(lastCycleStart)
  predictedPeriodDate.setDate(predictedPeriodDate.getDate() + avgCycleLength)

  // Ovulation = cycle_length - 14 days from cycle start
  const ovulationDay = avgCycleLength - 14
  const ovulationDate = new Date(lastCycleStart)
  ovulationDate.setDate(ovulationDate.getDate() + ovulationDay)

  // Fertile window = ovulation ± 2 days
  const fertileWindowStart = new Date(ovulationDate)
  fertileWindowStart.setDate(fertileWindowStart.getDate() - 2)
  const fertileWindowEnd = new Date(ovulationDate)
  fertileWindowEnd.setDate(fertileWindowEnd.getDate() + 2)

  // Confidence based on number of cycles tracked and regularity
  // More data = higher confidence, capped at 0.9 for rule-based
  const confidence = Math.min(0.9, 0.3 + (cycleCount * 0.1))

  return {
    predictedPeriodDate,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    confidence,
    method: 'rule_based',
  }
}

/**
 * Compute analytics from cycle history.
 */
export function computeAnalytics(cycles: CycleRecord[]): AnalyticsResult {
  const validLengths = cycles
    .filter(c => c.length !== null && c.length > 0)
    .map(c => c.length!)

  const validPeriodLengths = cycles
    .filter(c => c.periodLength !== null && c.periodLength > 0)
    .map(c => c.periodLength!)

  // Average cycle length
  const avgCycleLength = validLengths.length > 0
    ? Math.round(validLengths.reduce((s, l) => s + l, 0) / validLengths.length)
    : 28

  // Standard deviation (cycle variation)
  const cycleVariation = validLengths.length > 1
    ? Math.round(standardDeviation(validLengths))
    : 0

  // Average period length
  const avgPeriodLength = validPeriodLengths.length > 0
    ? Math.round(validPeriodLengths.reduce((s, l) => s + l, 0) / validPeriodLengths.length)
    : 5

  // Irregular cycle detection
  let isIrregular = false
  let irregularReason: string | null = null

  if (cycleVariation > 7) {
    isIrregular = true
    irregularReason = `High cycle variation (${cycleVariation} days)`
  }

  // Check for cycles > 45 days
  const longCycles = validLengths.filter(l => l > 45)
  if (longCycles.length > 0) {
    isIrregular = true
    irregularReason = irregularReason
      ? `${irregularReason}; Cycles over 45 days detected`
      : 'Cycles over 45 days detected'
  }

  // Check for very short cycles (< 21 days)
  const shortCycles = validLengths.filter(l => l < 21)
  if (shortCycles.length > 0) {
    isIrregular = true
    irregularReason = irregularReason
      ? `${irregularReason}; Cycles under 21 days detected`
      : 'Cycles under 21 days detected'
  }

  return {
    avgCycleLength,
    cycleVariation,
    avgPeriodLength,
    totalCyclesTracked: cycles.length,
    isIrregular,
    irregularReason,
    cycleLengths: validLengths,
    periodLengths: validPeriodLengths,
  }
}

/**
 * Calculate standard deviation of an array of numbers.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((s, v) => s + v, 0) / (values.length - 1)
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Determine if a date falls within the fertile window.
 */
export function isInFertileWindow(
  date: Date,
  lastCycleStart: Date,
  avgCycleLength: number
): boolean {
  const ovulationDay = avgCycleLength - 14
  const ovulationDate = new Date(lastCycleStart)
  ovulationDate.setDate(ovulationDate.getDate() + ovulationDay)

  const fertileStart = new Date(ovulationDate)
  fertileStart.setDate(fertileStart.getDate() - 2)
  const fertileEnd = new Date(ovulationDate)
  fertileEnd.setDate(fertileEnd.getDate() + 2)

  return date >= fertileStart && date <= fertileEnd
}

/**
 * Get phase-specific hormone info for educational display
 */
export function getPhaseHormoneInfo(phase: string): {
  title: string
  description: string
  hormones: { name: string; trend: 'rising' | 'falling' | 'peak' | 'low' }[]
  commonExperiences: string[]
} {
  const phases: Record<string, ReturnType<typeof getPhaseHormoneInfo>> = {
    period: {
      title: 'Menstrual Phase',
      description: 'Hormone levels are at their lowest, triggering menstruation. The uterine lining sheds.',
      hormones: [
        { name: 'FSH (Follicle Stimulating Hormone)', trend: 'low' },
        { name: 'LH (Luteinizing Hormone)', trend: 'low' },
        { name: 'PG (Progesterone)', trend: 'low' },
        { name: 'E2 (Estrogen/Estradiol)', trend: 'low' },
      ],
      commonExperiences: [
        'Cramps and lower abdominal pain are common',
        'Energy levels tend to be lower',
        'Mood may feel low; rest and self-care help',
        'Bloating and headaches may occur',
      ],
    },
    follicular: {
      title: 'Follicular Phase',
      description: 'Estrogen rises as follicles develop. Energy and mood typically improve.',
      hormones: [
        { name: 'FSH (Follicle Stimulating Hormone)', trend: 'rising' },
        { name: 'LH (Luteinizing Hormone)', trend: 'rising' },
        { name: 'PG (Progesterone)', trend: 'low' },
        { name: 'E2 (Estrogen/Estradiol)', trend: 'rising' },
      ],
      commonExperiences: [
        'Energy and motivation increase',
        'Mood improves with rising estrogen',
        'Skin may appear clearer',
        'Good time for new projects and socializing',
      ],
    },
    ovulation: {
      title: 'Ovulation',
      description: 'LH surges, triggering egg release. Peak fertility and energy.',
      hormones: [
        { name: 'FSH (Follicle Stimulating Hormone)', trend: 'peak' },
        { name: 'LH (Luteinizing Hormone)', trend: 'peak' },
        { name: 'PG (Progesterone)', trend: 'rising' },
        { name: 'E2 (Estrogen/Estradiol)', trend: 'peak' },
      ],
      commonExperiences: [
        'Peak confidence and communication skills',
        'Highest energy levels of the cycle',
        'Some experience mild ovulation pain',
        'Cervical fluid increases — this is normal',
      ],
    },
    luteal: {
      title: 'Late Luteal Phase',
      description: 'If no pregnancy occurs, progesterone and estrogen drop sharply, triggering menstruation.',
      hormones: [
        { name: 'FSH (Follicle Stimulating Hormone)', trend: 'low' },
        { name: 'LH (Luteinizing Hormone)', trend: 'low' },
        { name: 'PG (Progesterone)', trend: 'falling' },
        { name: 'E2 (Estrogen/Estradiol)', trend: 'falling' },
      ],
      commonExperiences: [
        'PMS symptoms: irritability, low energy, cravings',
        'Mood may feel more sensitive',
        'Bloating, cramps, headaches, or disrupted sleep',
        'These symptoms ease as menstruation begins',
      ],
    },
  }

  return phases[phase] || phases.period
}
