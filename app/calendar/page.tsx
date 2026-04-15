'use client'

import { LayoutWrapper } from '@/components/layout-wrapper'
import { CycleCalendar } from '@/components/cycle-calendar'

export default function CalendarPage() {
  return (
    <LayoutWrapper>
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500">View cycle phases and tap any day to log your health data.</p>
        </header>
        <CycleCalendar />
      </div>
    </LayoutWrapper>
  )
}
