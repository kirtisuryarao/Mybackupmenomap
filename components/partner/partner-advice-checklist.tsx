'use client'

import { useEffect, useMemo, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface PartnerAdviceChecklistProps {
  storageKey: string
  actions: string[]
}

export function PartnerAdviceChecklist({ storageKey, actions }: PartnerAdviceChecklistProps) {
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setCompleted(parsed.filter((entry): entry is string => typeof entry === 'string'))
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const tipsFollowed = useMemo(() => completed.length, [completed])
  const supportScore = useMemo(() => Math.min(100, 55 + tipsFollowed * 12), [tipsFollowed])

  const toggleAction = (action: string) => {
    setCompleted((previous) => {
      const next = previous.includes(action)
        ? previous.filter((entry) => entry !== action)
        : [...previous, action]

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      }

      return next
    })
  }

  return (
    <Card className="border-emerald-200 bg-white/90 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <span>🤝</span>
          What you should do today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Support score</p>
          <p className="text-3xl font-bold text-emerald-700">{supportScore}</p>
          <p className="text-sm text-emerald-800">Tips followed today: {tipsFollowed}</p>
        </div>

        <div className="space-y-3">
          {actions.map((action) => (
            <div key={action} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Checkbox
                id={action}
                checked={completed.includes(action)}
                onCheckedChange={() => toggleAction(action)}
              />
              <Label htmlFor={action} className="text-sm leading-6 text-slate-700">
                {action}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}