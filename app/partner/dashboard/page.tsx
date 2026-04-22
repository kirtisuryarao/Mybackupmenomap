'use client'

import { AlertCircle, Heart, Loader2, LogOut, RefreshCw, Send, ShieldCheck, Sprout, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { PartnerAdviceChecklist } from '@/components/partner/partner-advice-checklist'
import { PartnerCycleCalendar } from '@/components/partner/partner-cycle-calendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { partnerAuthenticatedFetch } from '@/lib/partner-auth-client'

import type { PartnerInsights } from '@/lib/services/partner-insights'

interface PartnerDashboardResponse {
  partner: {
    id: string
    name: string
  }
  linkedUser: {
    id: string
    name: string
    email: string
    cycleLength: number
  }
  cycleData: {
    lastPeriodDate: string | null
    cycleLength: number
    source: string
  }
  visibility: {
    cycle: boolean
    mood: boolean
    symptoms: boolean
    notes: boolean
  }
  prediction: {
    predictedPeriodDate?: string
    ovulationDate?: string
    fertileWindowStart?: string
    fertileWindowEnd?: string
    confidence?: number
  } | null
  insights: PartnerInsights | null
  recentLogs: Array<{
    id: string
    date: string
    flow: string | null
    mood: string[]
    symptoms: string[]
    notes: string | null
    sleepQuality: string | null
  }>
}

interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

const suggestedPrompts = ['What should I do today?', 'Is today safe?', 'Why is she feeling low?', 'How can I avoid conflict today?']

export default function PartnerDashboard() {
  const [partnerData, setPartnerData] = useState<PartnerDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [messages, setMessages] = useState<AiMessage[]>([])

  const fetchPartnerData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      const hasPartnerSession = Boolean(localStorage.getItem('partnerAccessToken') || localStorage.getItem('partnerRefreshToken'))
      if (!hasPartnerSession) {
        window.location.href = '/partner/login'
        return
      }

      const response = await partnerAuthenticatedFetch('/api/partner/data')

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerAccessToken')
          localStorage.removeItem('partnerRefreshToken')
          localStorage.removeItem('partnerId')
          window.location.href = '/partner/login'
          return
        }

        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to fetch partner dashboard')
      }

      const data = (await response.json()) as PartnerDashboardResponse
      setPartnerData(data)
      setError('')

      if (data.insights) {
        setMessages([
          {
            role: 'assistant',
            content: `${data.insights.support_advice} Fertility is ${data.insights.fertility_status.toLowerCase()} and the current phase is ${data.insights.phase.toLowerCase()}.`,
          },
        ])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPartnerData()

    const interval = window.setInterval(() => {
      fetchPartnerData(true)
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('partnerRefreshToken')
    fetch('/api/partner/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // Best effort logout API call.
    })

    localStorage.removeItem('partnerAccessToken')
    localStorage.removeItem('partnerRefreshToken')
    localStorage.removeItem('partnerId')
    localStorage.removeItem('partnerData')
    window.location.href = '/partner/login'
  }

  const askAssistant = async (question: string) => {
    if (!question.trim()) return

    const hasPartnerSession = Boolean(localStorage.getItem('partnerAccessToken') || localStorage.getItem('partnerRefreshToken'))
    if (!hasPartnerSession) {
      window.location.href = '/partner/login'
      return
    }

    const nextUserMessage: AiMessage = { role: 'user', content: question }
    setMessages((previous) => [...previous, nextUserMessage])
    setAssistantInput('')
    setAssistantLoading(true)

    try {
      const response = await partnerAuthenticatedFetch('/api/partner/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: question }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to get partner guidance')
      }

      setMessages((previous) => [...previous, { role: 'assistant', content: payload.response }])
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Failed to get partner guidance',
        },
      ])
    } finally {
      setAssistantLoading(false)
    }
  }

  const handleAssistantSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    askAssistant(assistantInput)
  }

  const checklistStorageKey = useMemo(
    () => (partnerData?.partner.id ? `menomap-partner-actions:${partnerData.partner.id}:${new Date().toISOString().slice(0, 10)}` : 'menomap-partner-actions'),
    [partnerData?.partner.id],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#eff6ff,_#f0fdf4_55%,_#ffffff)]">
        <div className="text-center">
          <div className="mb-4 inline-flex rounded-2xl bg-sky-100 p-4 text-sky-700 shadow-sm">
            <Heart className="h-10 w-10 animate-pulse" />
          </div>
          <p className="text-lg font-medium text-slate-700">Loading partner intelligence...</p>
        </div>
      </div>
    )
  }

  if (error || !partnerData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#eff6ff,_#f0fdf4_55%,_#ffffff)] px-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-3 text-red-700">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <p className="font-semibold">{error || 'Unable to load dashboard'}</p>
            </div>
            <Button onClick={() => (window.location.href = '/partner/login')} className="w-full">
              Return to login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { linkedUser, visibility, insights, recentLogs, prediction } = partnerData

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#f0fdf4_55%,_#ffffff)]">
      <header className="border-b border-sky-100 bg-white/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-600 p-3 text-white shadow-sm">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Partner Dashboard</h1>
              <p className="text-sm text-slate-600">Viewing partner&apos;s data for {linkedUser.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchPartnerData(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="text-slate-700 hover:text-slate-900">
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>

        <div className="border-t border-sky-100 bg-sky-50/80 px-4 py-3">
          <p className="text-center text-sm font-medium text-sky-900">👉 Viewing partner&apos;s data with privacy-aware visibility. This dashboard updates from the same live cycle data used in the main app.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {!insights ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 text-center text-slate-700">
              Cycle data is not available yet. Ask {linkedUser.name} to log their period so personalized partner guidance can appear here.
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Card className="overflow-hidden border-sky-200 bg-white/90 shadow-sm">
                <CardHeader className="bg-[linear-gradient(135deg,_rgba(14,165,233,0.08),_rgba(34,197,94,0.08))]">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <span>🔥</span>
                    Today status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MetricCard
                      label="Current day"
                      value={`Day ${insights.current_day}`}
                      description={`of an estimated ${partnerData.cycleData.cycleLength}-day cycle`}
                      tone="sky"
                    />
                    <MetricCard
                      label="Phase"
                      value={getPhaseDisplayLabel(insights.phase)}
                      description={insights.phase}
                      tone="emerald"
                    />
                    <MetricCard
                      label="Fertility"
                      value={insights.is_ovulation ? 'Peak' : insights.is_fertile ? 'Fertile' : 'Low'}
                      description={getFertilityDescription(insights)}
                      tone={insights.is_ovulation ? 'sky' : insights.is_fertile ? 'rose' : 'emerald'}
                    />
                    <MetricCard
                      label="Next period"
                      value={formatShortDate(insights.next_period_date)}
                      description={getNextPeriodDescription(insights.days_to_next_period)}
                      tone="slate"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cycle guidance</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{insights.support_advice}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Energy: {insights.energy_level}</Badge>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Mood: {insights.mood_tendency}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Probability: {insights.fertility_probability}</Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Predictions</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>Ovulation day: Day {insights.ovulation_day} ({formatDisplayDate(insights.ovulation_date)})</p>
                        <p>Fertile window: Day {insights.fertile_window[0]} to Day {insights.fertile_window[1]}</p>
                        <p>Next period: {formatDisplayDate(insights.next_period_date)}</p>
                        <p>Safe day status: {insights.is_safe_day ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <span>❤️</span>
                    What she may feel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <FeelingRow label="Phase" value={insights.phase} />
                  <FeelingRow label="Likely mood" value={insights.mood_tendency} />
                  <FeelingRow label="Energy" value={insights.energy_level} />
                  <FeelingRow label="Support tone" value={insights.relationship_insights[0] || insights.support_advice} />

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <p className="font-semibold">Visibility</p>
                    <p className="mt-1 text-xs">Mood: {visibility.mood ? 'Shared' : 'Hidden'} • Symptoms: {visibility.symptoms ? 'Shared' : 'Hidden'} • Notes: {visibility.notes ? 'Shared' : 'Hidden'}</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PartnerAdviceChecklist storageKey={checklistStorageKey} actions={insights.support_actions} />

              <Card className="border-amber-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <TriangleAlert className="h-5 w-5 text-amber-600" />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(insights.alerts.length > 0 ? insights.alerts : ['No urgent alerts today.']).map((alert) => (
                    <div key={alert} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {alert}
                    </div>
                  ))}

                  {insights.warnings.map((warning) => (
                    <div key={warning} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                      {warning}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <PartnerCycleCalendar days={insights.calendar} />

              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Sprout className="h-5 w-5 text-emerald-600" />
                    Insights and patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Relationship intelligence</p>
                    <div className="mt-3 space-y-2">
                      {insights.relationship_insights.map((item) => (
                        <div key={item} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pattern analysis</p>
                    <div className="mt-3 space-y-2">
                      {insights.pattern_insights.map((item) => (
                        <div key={item} className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent visible signals</p>
                    <div className="mt-3 grid gap-3">
                      <SignalCard label="Mood" values={insights.recent_signals.moods} emptyText="Mood visibility is off" />
                      <SignalCard label="Symptoms" values={insights.recent_signals.symptoms} emptyText="Symptoms visibility is off" />
                      <SignalCard label="Notes" values={insights.recent_signals.notes_preview} emptyText="Notes visibility is off" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <ShieldCheck className="h-5 w-5 text-sky-600" />
                    Predictions and privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">Support score</p>
                    <p className="mt-1 text-3xl font-bold text-sky-700">{insights.support_score.support_score}</p>
                    <p className="text-slate-600">{insights.support_score.status}</p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p>Prediction confidence: {Math.round((prediction?.confidence || 0.5) * 100)}%</p>
                    <p>Cycle source: {partnerData.cycleData.source.replaceAll('_', ' ')}</p>
                    <p>Last period date: {partnerData.cycleData.lastPeriodDate ? formatDisplayDate(partnerData.cycleData.lastPeriodDate) : 'Not available'}</p>
                    <p>Latest logs synced: {recentLogs.length}</p>
                  </div>

                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
                    Read-only access respects the user&apos;s current sharing choices. Hidden data never renders here.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <span>🧠</span>
                    Partner AI assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`rounded-2xl px-4 py-3 text-sm ${message.role === 'assistant' ? 'bg-white text-slate-700' : 'bg-sky-600 text-white'}`}
                      >
                        {message.content}
                      </div>
                    ))}
                    {assistantLoading && (
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt) => (
                      <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => askAssistant(prompt)}>
                        {prompt}
                      </Button>
                    ))}
                  </div>

                  <form onSubmit={handleAssistantSubmit} className="flex gap-2">
                    <Input
                      value={assistantInput}
                      onChange={(event) => setAssistantInput(event.target.value)}
                      placeholder="Ask what to do today, whether it is safe, or why she feels low..."
                    />
                    <Button type="submit" disabled={assistantLoading || !assistantInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
  tone,
}: {
  label: string
  value: string
  description?: string
  tone: 'sky' | 'emerald' | 'rose' | 'slate'
}) {
  const toneClass = {
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  }[tone]

  return (
    <div className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] opacity-70">{label}</p>
      <div className="mt-2 min-w-0">
        <p className="text-xl leading-tight font-bold sm:text-2xl">{value}</p>
        {description ? <p className="mt-2 text-xs leading-relaxed opacity-80">{description}</p> : null}
      </div>
    </div>
  )
}

function getPhaseDisplayLabel(phase: PartnerInsights['phase']) {
  switch (phase) {
    case 'Menstruation':
      return 'Period'
    case 'Follicular':
      return 'Follicular'
    case 'Ovulation':
      return 'Ovulation'
    case 'Luteal':
      return 'Luteal'
    default:
      return phase
  }
}

function getFertilityDescription(insights: PartnerInsights) {
  if (insights.is_ovulation) {
    return 'Ovulation day. Pregnancy likelihood is highest.'
  }

  if (insights.is_fertile) {
    return `Fertile window is active. Probability is ${insights.fertility_probability.toLowerCase()}.`
  }

  return `Outside the fertile window. Probability is ${insights.fertility_probability.toLowerCase()}.`
}

function getNextPeriodDescription(daysToNextPeriod: number) {
  if (daysToNextPeriod === 0) return 'Expected today'
  if (daysToNextPeriod === 1) return 'Expected tomorrow'
  return `Expected in ${daysToNextPeriod} days`
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function FeelingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <p className="text-slate-500">{label}</p>
      <p className="max-w-[14rem] text-right font-medium text-slate-900">{value}</p>
    </div>
  )
}

function SignalCard({ label, values, emptyText }: { label: string; values: string[]; emptyText: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-700">{values.length > 0 ? values.join(', ') : emptyText}</p>
    </div>
  )
}

function formatDisplayDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}