'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLogs, DailyLog } from '@/hooks/use-logs'
import { useCycleData } from '@/hooks/use-cycle-data'
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Thermometer,
  X,
  Check,
} from 'lucide-react'

// Options matching the Clue app screenshots
const FLOW_OPTIONS = [
  { value: 'light', label: 'Light', icon: '🩸' },
  { value: 'medium', label: 'Medium', icon: '🩸🩸' },
  { value: 'heavy', label: 'Heavy', icon: '🩸🩸🩸' },
  { value: 'super_heavy', label: 'Super Heavy', icon: '🩸🩸🩸🩸' },
]

const SPOTTING_OPTIONS = [
  { value: 'red', label: 'Red', color: 'bg-red-500' },
  { value: 'brown', label: 'Brown', color: 'bg-amber-800' },
]

const MOOD_OPTIONS = [
  'Mood swings', 'Not in control', 'Fine', 'Happy', 'Sad',
  'Sensitive', 'Angry', 'Confident', 'Excited', 'Irritable',
  'Anxious', 'Insecure', 'Grateful', 'Indifferent',
]

const SYMPTOM_OPTIONS = [
  'Pain free', 'Cramps', 'Ovulation pain', 'Breast tenderness',
  'Headache', 'Fatigue', 'Bloating', 'Back pain',
  'Nausea', 'Acne', 'Insomnia', 'Dizziness',
]

const SLEEP_OPTIONS = [
  { value: 'good', label: 'Good', icon: '😴' },
  { value: 'fair', label: 'Fair', icon: '😐' },
  { value: 'poor', label: 'Poor', icon: '😫' },
]

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekDates(centerDate: Date): Date[] {
  const dates: Date[] = []
  const start = new Date(centerDate)
  start.setDate(start.getDate() - 3)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

export default function TrackingPage() {
  const { logs, isLoading, getLogForDate, saveLog } = useLogs()
  const { todayInfo } = useCycleData()
  const [selectedDate, setSelectedDate] = useState(getDateString(new Date()))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [flow, setFlow] = useState<string | null>(null)
  const [spotting, setSpotting] = useState<string | null>(null)
  const [mood, setMood] = useState<string[]>([])
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [temperature, setTemperature] = useState<string>('')
  const [sleepQuality, setSleepQuality] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  // Load existing log for selected date
  useEffect(() => {
    const existing = getLogForDate(selectedDate)
    if (existing) {
      setFlow(existing.flow)
      setSpotting(existing.spotting)
      setMood(existing.mood || [])
      setSymptoms(existing.symptoms || [])
      setTemperature(existing.temperature?.toString() || '')
      setSleepQuality(existing.sleepQuality)
      setNotes(existing.notes || '')
    } else {
      setFlow(null)
      setSpotting(null)
      setMood([])
      setSymptoms([])
      setTemperature('')
      setSleepQuality(null)
      setNotes('')
    }
    setSaved(false)
  }, [selectedDate, getLogForDate])

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(getDateString(d))
  }

  const toggleMood = (m: string) => {
    setMood(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    setSaved(false)
  }

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const log: DailyLog = {
        date: selectedDate,
        flow,
        spotting,
        mood,
        symptoms,
        temperature: temperature ? parseFloat(temperature) : null,
        sleepQuality,
        notes: notes || null,
      }
      await saveLog(log)
      setSaved(true)
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  const weekDates = getWeekDates(new Date(selectedDate + 'T00:00:00'))

  return (
    <LayoutWrapper>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Date Selector Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-lg font-semibold">{formatDateDisplay(selectedDate)}</p>
              <p className="text-sm text-muted-foreground">{selectedDate}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Week strip */}
          <div className="flex justify-center gap-1">
            {weekDates.map((d) => {
              const ds = getDateString(d)
              const isSelected = ds === selectedDate
              const hasLog = getLogForDate(ds)
              const isToday = ds === getDateString(new Date())
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDate(ds)}
                  className={`flex flex-col items-center p-2 rounded-lg min-w-[44px] transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-xs">{d.toLocaleDateString('en', { weekday: 'short' }).charAt(0)}</span>
                  <span className="text-sm font-medium">{d.getDate()}</span>
                  {hasLog && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Period Flow */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Period Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {FLOW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFlow(flow === opt.value ? null : opt.value); setSaved(false) }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    flow === opt.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : 'border-border hover:border-red-300'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spotting */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Spotting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {SPOTTING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSpotting(spotting === opt.value ? null : opt.value); setSaved(false) }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 flex-1 transition-all ${
                    spotting === opt.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : 'border-border hover:border-red-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${opt.color}`} />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feelings / Mood */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Feelings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => toggleMood(m)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    mood.includes(m)
                      ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                      : 'border-border hover:border-orange-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pain / Symptoms */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pain & Symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {SYMPTOM_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    symptoms.includes(s)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-border hover:border-blue-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Basal Body Temperature */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Basal Body Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={temperature}
                onChange={(e) => { setTemperature(e.target.value); setSaved(false) }}
                placeholder="36.5"
                className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Quality */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sleep Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {SLEEP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSleepQuality(sleepQuality === opt.value ? null : opt.value); setSaved(false) }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 flex-1 transition-all ${
                    sleepQuality === opt.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                      : 'border-border hover:border-purple-300'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
              placeholder="Any additional notes for today..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              maxLength={500}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="sticky bottom-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {saving ? (
              'Saving...'
            ) : saved ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Log
              </>
            )}
          </Button>
        </div>
      </div>
    </LayoutWrapper>
  )
}
