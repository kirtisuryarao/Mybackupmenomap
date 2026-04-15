export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal'

export interface CycleData {
  lastPeriodDate: string // YYYY-MM-DD
  cycleLength: number // days (default 28)
  cycleStarts?: string[] // all detected cycle start dates YYYY-MM-DD
}

export interface DayInfo {
  date: Date
  dayOfCycle: number
  phase: CyclePhase
  isCycleDay: boolean
}

/**
 * Calculate the day number in the current cycle (1-28)
 */
export function calculateDayOfCycle(lastPeriodDate: Date, currentDate: Date, cycleLength: number): number {
  const diff = Math.floor((currentDate.getTime() - lastPeriodDate.getTime()) / (1000 * 60 * 60 * 24))
  return (diff % cycleLength) + 1
}

/**
 * Get the cycle phase based on day number
 * Standard 28-day cycle:
 * Days 1-5: Period (Menstruation)
 * Days 1-13: Follicular
 * Day 14: Ovulation
 * Days 15-28: Luteal (PMS)
 */
export function getCyclePhase(dayOfCycle: number, cycleLength: number = 28): CyclePhase {
  const ovulationDay = Math.floor(cycleLength / 2)
  const periodLength = 5
  const lutealStart = ovulationDay + 1

  if (dayOfCycle <= periodLength) {
    return 'period'
  }

  if (dayOfCycle <= ovulationDay - 1) {
    return 'follicular'
  }

  if (dayOfCycle === ovulationDay) {
    return 'ovulation'
  }

  return 'luteal'
}

/**
 * Get information about a specific day in the cycle
 */
export function getDayInfo(
  date: Date,
  lastPeriodDate: Date,
  cycleLength: number
): DayInfo {
  const dayOfCycle = calculateDayOfCycle(lastPeriodDate, date, cycleLength)
  const phase = getCyclePhase(dayOfCycle, cycleLength)

  return {
    date,
    dayOfCycle,
    phase,
    isCycleDay: true,
  }
}

/**
 * Get all days in a month with their cycle information.
 * When cycleStarts is provided (actual tracked cycle start dates), each day
 * anchors to the most recent start that is on or before that day, giving
 * accurate phase colours for past months. For future days beyond all known
 * starts, the mathematical projection from lastPeriodDate is used.
 */
export function getMonthCycleDays(
  year: number,
  month: number,
  lastPeriodDate: Date,
  cycleLength: number,
  cycleStarts?: Date[]
): DayInfo[] {
  const lastDay = new Date(year, month + 1, 0)
  const days: DayInfo[] = []

  // Sort ascending so we can binary-scan for the best anchor per day
  const sortedStarts = cycleStarts && cycleStarts.length > 0
    ? [...cycleStarts].sort((a, b) => a.getTime() - b.getTime())
    : null

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)

    let refDate = lastPeriodDate
    if (sortedStarts) {
      // Find the latest cycle start that is on or before this day
      for (const start of sortedStarts) {
        if (start <= date) {
          refDate = start
        } else {
          break
        }
      }
    }

    days.push(getDayInfo(date, refDate, cycleLength))
  }

  return days
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the next period date
 */
export function getNextPeriodDate(lastPeriodDate: Date, cycleLength: number): Date {
  const nextPeriod = new Date(lastPeriodDate)
  nextPeriod.setDate(nextPeriod.getDate() + cycleLength)
  return nextPeriod
}

/**
 * Get ovulation date for the current cycle
 */
export function getOvulationDate(lastPeriodDate: Date, cycleLength: number): Date {
  const ovulationDay = Math.floor(cycleLength / 2)
  const ovulation = new Date(lastPeriodDate)
  ovulation.setDate(ovulation.getDate() + ovulationDay - 1)
  return ovulation
}

/**
 * Calculate days until next phase change
 */
export function daysUntilPhaseChange(
  lastPeriodDate: Date,
  currentDate: Date,
  cycleLength: number
): number {
  const dayOfCycle = calculateDayOfCycle(lastPeriodDate, currentDate, cycleLength)
  const periodLength = 5
  const ovulationDay = Math.floor(cycleLength / 2)

  if (dayOfCycle <= periodLength) {
    return periodLength - dayOfCycle + 1
  }

  if (dayOfCycle <= ovulationDay - 1) {
    return ovulationDay - dayOfCycle
  }

  if (dayOfCycle === ovulationDay) {
    return 1
  }

  return cycleLength - dayOfCycle + 1
}
