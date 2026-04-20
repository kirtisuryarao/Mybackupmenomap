export type ReminderKind = 'period' | 'ovulation'

export interface ReminderScheduleItem {
  kind: ReminderKind
  enabled: boolean
  label: string
  date: Date | null
  daysFromToday: number | null
}

interface ReminderCopy {
  reminderOff: string
  needCycleData: string
  today: string
  inLabel: string
  daysLabel: string
}

interface ReminderScheduleInput {
  periodReminder: boolean
  ovulationReminder: boolean
  nextPeriodDate: Date | null
  ovulationDate: Date | null
  locale?: string
  copy?: Partial<ReminderCopy>
}

const defaultCopy: ReminderCopy = {
  reminderOff: 'Reminder off',
  needCycleData: 'Need more cycle data to schedule',
  today: 'Today',
  inLabel: 'In',
  daysLabel: 'days',
}

function formatDateLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

function calculateDaysFromToday(date: Date) {
  const today = new Date()
  const atMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((target.getTime() - atMidnight.getTime()) / 86_400_000)
}

function toScheduleItem(
  kind: ReminderKind,
  enabled: boolean,
  date: Date | null,
  locale: string,
  copy: ReminderCopy
): ReminderScheduleItem {
  if (!enabled) {
    return {
      kind,
      enabled,
      label: copy.reminderOff,
      date: null,
      daysFromToday: null,
    }
  }

  if (!date) {
    return {
      kind,
      enabled,
      label: copy.needCycleData,
      date: null,
      daysFromToday: null,
    }
  }

  const daysFromToday = calculateDaysFromToday(date)
  const prefix = daysFromToday <= 0 ? copy.today : `${copy.inLabel} ${daysFromToday} ${copy.daysLabel}`

  return {
    kind,
    enabled,
    label: `${prefix} · ${formatDateLabel(date, locale)}`,
    date,
    daysFromToday,
  }
}

export function buildReminderSchedule(input: ReminderScheduleInput): ReminderScheduleItem[] {
  const locale = input.locale ?? 'en'
  const copy: ReminderCopy = {
    ...defaultCopy,
    ...input.copy,
  }

  return [
    toScheduleItem('period', input.periodReminder, input.nextPeriodDate, locale, copy),
    toScheduleItem('ovulation', input.ovulationReminder, input.ovulationDate, locale, copy),
  ]
}
