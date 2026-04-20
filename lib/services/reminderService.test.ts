import { buildReminderSchedule } from '@/lib/services/reminderService'

describe('reminderService', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-20T00:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('buildReminderSchedule', () => {
    it('should return off label when reminder is disabled', () => {
      const schedule = buildReminderSchedule({
        periodReminder: false,
        ovulationReminder: true,
        nextPeriodDate: new Date('2026-04-25'),
        ovulationDate: new Date('2026-04-18'),
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.enabled).toBe(false)
      expect(period?.label).toBe('Reminder off')
      expect(period?.date).toBeNull()
    })

    it('should return need data label when date is null', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: false,
        nextPeriodDate: null,
        ovulationDate: null,
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.enabled).toBe(true)
      expect(period?.label).toBe('Need more cycle data to schedule')
    })

    it('should show Today when reminder date is today', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: false,
        nextPeriodDate: new Date('2026-04-20'),
        ovulationDate: null,
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.label).toContain('Today')
    })

    it('should show days count when reminder is in future', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: false,
        nextPeriodDate: new Date('2026-04-25'),
        ovulationDate: null,
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.label).toContain('In 5 days')
    })

    it('should include date label in output', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: false,
        nextPeriodDate: new Date('2026-04-25'),
        ovulationDate: null,
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.label).toContain('Apr 25')
    })

    it('should calculate daysFromToday correctly', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: true,
        nextPeriodDate: new Date('2026-05-01'),
        ovulationDate: new Date('2026-04-30'),
      })

      const period = schedule.find((s) => s.kind === 'period')
      const ovulation = schedule.find((s) => s.kind === 'ovulation')

      expect(period?.daysFromToday).toBe(11)
      expect(ovulation?.daysFromToday).toBe(10)
    })

    it('should return array with period and ovulation items in order', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: true,
        nextPeriodDate: new Date('2026-04-25'),
        ovulationDate: new Date('2026-04-18'),
      })

      expect(schedule.length).toBe(2)
      expect(schedule[0].kind).toBe('period')
      expect(schedule[1].kind).toBe('ovulation')
    })

    it('should respect locale parameter for date formatting', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: false,
        nextPeriodDate: new Date('2026-04-25'),
        ovulationDate: null,
        locale: 'en-US',
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.label).toContain('Apr')
    })

    it('should accept custom copy for UI text', () => {
      const schedule = buildReminderSchedule({
        periodReminder: false,
        ovulationReminder: false,
        nextPeriodDate: null,
        ovulationDate: null,
        copy: {
          reminderOff: 'Custom Off',
          needCycleData: 'Custom Need Data',
          today: 'Today',
          inLabel: 'In',
          daysLabel: 'days',
        },
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.label).toBe('Custom Off')
    })

    it('should handle past dates (overdue reminders)', () => {
      const schedule = buildReminderSchedule({
        periodReminder: true,
        ovulationReminder: false,
        nextPeriodDate: new Date('2026-04-15'),
        ovulationDate: null,
      })

      const period = schedule.find((s) => s.kind === 'period')
      expect(period?.daysFromToday).toBe(-5)
      expect(period?.label).toContain('Today')
    })
  })
})
