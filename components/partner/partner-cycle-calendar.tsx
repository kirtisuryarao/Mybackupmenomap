'use client'

import { useMemo, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { PartnerCalendarDay } from '@/lib/services/partner-insights'

interface PartnerCycleCalendarProps {
  days: PartnerCalendarDay[]
}

const classificationStyles: Record<PartnerCalendarDay['classification'], string> = {
  period: 'bg-rose-100 text-rose-700 border-rose-200',
  fertile: 'bg-red-100 text-red-700 border-red-200',
  ovulation: 'bg-sky-100 text-sky-700 border-sky-200',
  safe: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export function PartnerCycleCalendar({ days }: PartnerCycleCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(days.find((day) => day.isToday)?.date ?? days[0]?.date)

  const selectedDay = useMemo(
    () => days.find((day) => day.date === selectedDate) ?? days.find((day) => day.isToday) ?? days[0],
    [days, selectedDate],
  )

  return (
    <Card className="border-sky-200 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <span>📅</span>
          Cycle calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    'rounded-xl border p-2 text-left transition hover:scale-[1.02] hover:shadow-sm',
                    classificationStyles[day.classification],
                    day.date === selectedDay?.date && 'ring-2 ring-slate-900/20',
                    day.isToday && 'shadow-md',
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wide opacity-70">D{day.day}</div>
                  <div className="text-sm font-semibold">{new Date(day.date).getDate()}</div>
                  <div className="text-[10px]">{day.label}</div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56">
                <p>{day.explanation}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected day</p>
            <p className="text-lg font-semibold text-slate-900">
              {selectedDay ? new Date(selectedDay.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'No day selected'}
            </p>
            <p className="text-sm text-slate-600">{selectedDay?.explanation}</p>
          </div>

          {selectedDay && (
            <div className={cn('rounded-full border px-4 py-2 text-sm font-semibold', classificationStyles[selectedDay.classification])}>
              {selectedDay.label}
            </div>
          )}
        </div>

        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <LegendItem label="Period" tone={classificationStyles.period} />
          <LegendItem label="Fertile" tone={classificationStyles.fertile} />
          <LegendItem label="Ovulation" tone={classificationStyles.ovulation} />
          <LegendItem label="Safe" tone={classificationStyles.safe} />
        </div>
      </CardContent>
    </Card>
  )
}

function LegendItem({ label, tone }: { label: string; tone: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className={cn('inline-block size-3 rounded-full border', tone)} />
      <span>{label}</span>
    </div>
  )
}