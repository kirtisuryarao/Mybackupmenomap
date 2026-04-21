'use client'

import { BookOpen, HeartPulse, Pill } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const STORAGE_KEY = 'menomap:medication-tracker'

const RELIEF_TOOLS = [
  'Box breathing: inhale 4, hold 4, exhale 4, hold 4 for 3 cycles.',
  'Keep a cool drink nearby and loosen clothing layers before bed.',
  'Use a 10-minute wind-down without screens if evenings feel restless.',
]

const SLEEP_TIPS = [
  'Aim for a regular wake time, even after a poor night.',
  'Reduce caffeine late in the day if night sweats or racing thoughts appear.',
  'Keep the bedroom cool and note whether symptoms change after hydration or stretching.',
]

const KNOWLEDGE_TIPS = [
  'Perimenopause often shows up as symptom variability, not just missed periods.',
  'Sleep changes can amplify fatigue, irritability, and hot flash sensitivity.',
  'Consistent symptom logs help spot patterns worth discussing with a clinician.',
]

export function MenopauseSupportCard() {
  const [medication, setMedication] = useState('')
  const [entries, setEntries] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setEntries(JSON.parse(stored) as string[])
      } catch {
        setEntries([])
      }
    }
  }, [])

  const persistEntries = (nextEntries: string[]) => {
    setEntries(nextEntries)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries))
    }
  }

  const addEntry = () => {
    const trimmed = medication.trim()
    if (!trimmed) {
      return
    }

    persistEntries([trimmed, ...entries].slice(0, 6))
    setMedication('')
  }

  return (
    <Card className="border-rose-100 bg-gradient-to-br from-white via-rose-50 to-orange-50 shadow-[0_10px_30px_rgba(244,63,94,0.08)]">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900">Relief tools and support</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HeartPulse className="h-4 w-4 text-rose-500" />
            Relief Tools
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            {RELIEF_TOOLS.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white/80 p-3 text-sm text-slate-700">
            Breathing guide: inhale through your nose for 4, hold for 4, exhale for 4, pause for 4. Repeat for 3 to 5 rounds.
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Pill className="h-4 w-4 text-orange-500" />
            Treatment Tracker
          </div>
          <div className="flex gap-2">
            <Input
              value={medication}
              onChange={(event) => setMedication(event.target.value)}
              placeholder="Optional medication or supplement note"
            />
            <Button type="button" onClick={addEntry}>Add</Button>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            {entries.length === 0 ? (
              <p>No medication notes yet.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry} className="rounded-xl border border-orange-100 bg-white/80 px-3 py-2">
                  {entry}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen className="h-4 w-4 text-teal-500" />
            Knowledge Section
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            {SLEEP_TIPS.concat(KNOWLEDGE_TIPS).map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}