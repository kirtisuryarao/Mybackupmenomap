'use client'

import { CycleCalendar } from '@/components/cycle-calendar'
import { HealthTimelineCard } from '@/components/health-timeline-card'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { useLogs } from '@/hooks/use-logs'
import { useProfileData } from '@/hooks/use-profile-data'
import { isMenopauseMode } from '@/lib/menopause'

export default function CalendarPage() {
  const { logs } = useLogs()
  const { profile } = useProfileData()
  const menopauseModeActive = isMenopauseMode(profile?.menopauseStage)

  return (
    <LayoutWrapper>
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500">
            {menopauseModeActive
              ? 'Menopause mode active. Use the calendar to review symptom, sleep, mood, and period notes by day.'
              : 'View cycle phases and tap any day to log your health data.'}
          </p>
        </header>
        <CycleCalendar />
        <HealthTimelineCard title="Calendar timeline" logs={logs.slice(0, 6)} />
      </div>
    </LayoutWrapper>
  )
}
