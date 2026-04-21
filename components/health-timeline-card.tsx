'use client'

import { Moon, SmilePlus, ThermometerSun } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { DailyLog } from '@/hooks/use-logs'

function formatTimelineDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function HealthTimelineCard({
  title,
  logs,
}: {
  title: string
  logs: DailyLog[]
}) {
  return (
    <Card className="border-slate-100 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">No symptom timeline yet. Start with how you feel today.</p>
        ) : (
          logs.map((log) => (
            <div key={`${log.date}-${log.id || 'entry'}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatTimelineDate(log.date)}</p>
                  <p className="text-xs text-slate-500">{log.flow ? 'Period logged' : 'Tracking symptoms'}</p>
                </div>
                {log.flow && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Period</Badge>}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {log.moodText && (
                  <Badge variant="outline" className="border-orange-200 bg-white text-orange-700">
                    <SmilePlus className="mr-1 h-3 w-3" />
                    {log.moodText}
                  </Badge>
                )}
                {typeof log.sleepHours === 'number' && (
                  <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700">
                    <Moon className="mr-1 h-3 w-3" />
                    {log.sleepHours}h sleep
                  </Badge>
                )}
                {log.temperature && (
                  <Badge variant="outline" className="border-teal-200 bg-white text-teal-700">
                    <ThermometerSun className="mr-1 h-3 w-3" />
                    {log.temperature}°C
                  </Badge>
                )}
                {log.symptoms.slice(0, 4).map((symptom) => (
                  <Badge key={`${log.date}-${symptom}`} variant="secondary" className="bg-sky-100 text-sky-700">
                    {symptom}
                  </Badge>
                ))}
              </div>

              {log.notes && <p className="mt-3 text-sm text-slate-600">{log.notes}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}