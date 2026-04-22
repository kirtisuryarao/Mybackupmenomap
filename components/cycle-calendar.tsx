'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { TrackModal } from '@/components/track-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCycleData } from '@/hooks/use-cycle-data'
import { useLogs } from '@/hooks/use-logs'
import { useProfileData } from '@/hooks/use-profile-data'
import { getMonthCycleDays, CyclePhase } from '@/lib/cycle-calculations'
import { formatLocalDate } from '@/lib/date'
import { isMenopauseMode } from '@/lib/menopause'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PHASE_COLORS: Record<CyclePhase, string> = {
  period: 'bg-red-200 hover:bg-red-300 text-red-900',
  follicular: 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900',
  ovulation: 'bg-blue-200 hover:bg-blue-300 text-blue-900',
  luteal: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
}

const PHASE_LABELS: Record<CyclePhase, string> = {
  period: 'Period',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal/PMS',
}

interface CycleCalendarProps {
  onRefresh?: () => void
}

export function CycleCalendar({ onRefresh }: CycleCalendarProps) {
  const { cycleData, isLoading } = useCycleData()
  const { logs, isLoading: logsLoading } = useLogs()
  const { profile, loading: profileLoading } = useProfileData()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false)

  const menopauseModeActive = isMenopauseMode(profile?.menopauseStage)
  const hasCycleCalendar = Boolean(cycleData && !menopauseModeActive)

  if (isLoading || logsLoading || profileLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading calendar...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const cycleStartDates = cycleData?.cycleStarts?.map((s) => new Date(s))
  const monthDays = hasCycleCalendar
    ? getMonthCycleDays(
        year,
        month,
        new Date(cycleData!.lastPeriodDate),
        cycleData!.cycleLength,
        cycleStartDates
      )
    : Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
        const date = new Date(year, month, index + 1)
        return {
          date,
          phase: 'luteal' as CyclePhase,
          dayOfCycle: index + 1,
        }
      })

  const logByDate = new Map(
    logs.map((log) => [log.date, log])
  )

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const emptyDays = Array(firstDayOfMonth).fill(null)

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthName = new Date(year, month).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsTrackModalOpen(true)
  }

  const handleTrackingSuccess = () => {
    setIsTrackModalOpen(false)
    if (onRefresh) {
      setTimeout(() => onRefresh(), 500)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty days before month starts */}
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {monthDays.map((dayInfo, idx) => {
              const isToday =
                dayInfo.date.toDateString() === new Date().toDateString()
              const isoDate = formatLocalDate(dayInfo.date)
              const log = logByDate.get(isoDate)
              const hasPeriod = Boolean(log?.flow)
              const hasHealthEntry = Boolean(
                log && (
                  log.symptoms.length
                  || log.mood.length
                  || log.moodText
                  || log.sleepHours
                  || log.sleepQuality
                  || log.temperature
                  || log.notes
                  || log.spotting
                )
              )
              const phaseColor = hasCycleCalendar
                ? PHASE_COLORS[dayInfo.phase]
                : hasPeriod
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-900'
                  : hasHealthEntry
                    ? 'bg-teal-50 hover:bg-teal-100 text-teal-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'

              return (
                <button
                  key={idx}
                  onClick={() => handleDateClick(dayInfo.date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg p-1 transition-all cursor-pointer ${phaseColor} ${
                    isToday ? 'ring-2 ring-primary shadow-md' : 'hover:ring-2 hover:ring-pink-400'
                  }`}
                  title={hasCycleCalendar ? `${PHASE_LABELS[dayInfo.phase]} - Day ${dayInfo.dayOfCycle}` : log ? 'Health log recorded' : 'Add health log'}
                >
                  <span className="text-xs font-semibold">
                    {dayInfo.date.getDate()}
                  </span>
                  {hasCycleCalendar ? (
                    <span className="text-xs">D{dayInfo.dayOfCycle}</span>
                  ) : hasPeriod ? (
                    <span className="text-[10px] font-semibold">Period</span>
                  ) : hasHealthEntry ? (
                    <span className="text-[10px] font-semibold">Log</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {hasCycleCalendar ? (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {(Object.entries(PHASE_LABELS) as Array<[CyclePhase, string]>).map(
                ([phase, label]) => (
                  <div key={phase} className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        PHASE_COLORS[phase].split(' ')[0]
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-100" />
                <span className="text-xs text-muted-foreground">Period logged</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-teal-100" />
                <span className="text-xs text-muted-foreground">Symptoms tracked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border border-slate-200 bg-white" />
                <span className="text-xs text-muted-foreground">No entry yet</span>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {hasCycleCalendar
              ? 'Click any date to log your health data.'
              : 'Click any date to track symptoms, sleep, mood, and optional period details.'}
          </p>
        </CardContent>
      </Card>

      {/* Track Modal */}
      <TrackModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        selectedDate={selectedDate}
        onSuccess={handleTrackingSuccess}
      />
    </>
  )
}
