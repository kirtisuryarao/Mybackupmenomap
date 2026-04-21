'use client'

import { ArrowRight, Menu, Smile, Droplets, Heart, Moon, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { CycleCircle } from '@/components/CycleCircle'
import { HealthAlertCard } from '@/components/health-alert-card'
import { HealthTimelineCard } from '@/components/health-timeline-card'
import { useI18n } from '@/components/i18n/language-provider'
import { MenopauseSupportCard } from '@/components/menopause-support-card'
import { useCycleData } from '@/hooks/use-cycle-data'
import { useLogs } from '@/hooks/use-logs'
import { usePrediction } from '@/hooks/use-prediction'
import { useProfileData } from '@/hooks/use-profile-data'
import { parseDate, getNextPeriodDate, getOvulationDate, daysUntilPhaseChange } from '@/lib/cycle-calculations'
import { isMenopauseMode } from '@/lib/menopause'

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

function getHomeInsight(dayOfCycle: number, cycleLength: number, phase: string, t: (key: string) => string): string {
  if (dayOfCycle <= 5) {
    return t('home.periodInProgress')
  }

  const daysUntilNextPeriod = Math.max(0, cycleLength - dayOfCycle + 1)

  if (daysUntilNextPeriod <= 3) {
    const key = daysUntilNextPeriod === 1 ? 'home.periodAway' : 'home.periodAwayPlural'
    return interpolate(t(key), { days: daysUntilNextPeriod })
  }

  if (phase === 'luteal') {
    return t('home.lateLuteal')
  }

  if (phase === 'ovulation') {
    return t('home.ovulatingToday')
  }

  return t('home.progressingSteadily')
}

function getPhaseEmoji(phase: string): string {
  switch (phase) {
    case 'period': return '🔴'
    case 'follicular': return '🌱'
    case 'ovulation': return '💎'
    case 'luteal': return '🌙'
    default: return '⭐'
  }
}

export function HomePage() {
  const { t } = useI18n()
  const { cycleData, todayInfo, isLoading: cycleLoading } = useCycleData()
  const { logs, isLoading: logsLoading } = useLogs()
  const { prediction, isLoading: predictionLoading } = usePrediction()
  const { profile, loading: profileLoading } = useProfileData()

  const isLoading = cycleLoading || predictionLoading || logsLoading || profileLoading
  const menopauseModeActive = prediction?.menopauseModeActive || isMenopauseMode(profile?.menopauseStage)
  const hasCycleView = Boolean(!menopauseModeActive && cycleData?.lastPeriodDate && todayInfo)
  const recentLogs = logs.slice(0, 4)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="mx-auto h-72 w-72 animate-pulse rounded-full bg-slate-100" />
      </div>
    )
  }

  if (!hasCycleView && recentLogs.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] space-y-6 pb-4">
        <header className="flex items-center justify-between rounded-3xl bg-white/90 px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Tracking symptoms</h1>
          <button
            type="button"
            className="rounded-2xl border border-teal-100 bg-teal-50 p-2 text-teal-700"
            aria-label={t('home.openMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <section className="rounded-3xl bg-white p-8 text-center shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          {menopauseModeActive && (
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
              Menopause mode active
            </span>
          )}
          <p className="mt-4 text-lg font-semibold text-slate-900">Track how you feel today</p>
          <p className="mt-2 text-sm text-slate-500">
            Symptoms, mood, sleep, and notes can be logged even when you are not tracking a period.
          </p>
          <Link
            href="/tracking"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            Start symptom log
          </Link>
        </section>

        <MenopauseSupportCard />
      </div>
    )
  }

  const nextPeriodDate = hasCycleView
    ? prediction?.predictedPeriodDate
      ? new Date(prediction.predictedPeriodDate)
      : getNextPeriodDate(parseDate(cycleData!.lastPeriodDate), cycleData!.cycleLength)
    : null
  
  const ovulationDate = hasCycleView
    ? getOvulationDate(parseDate(cycleData!.lastPeriodDate), cycleData!.cycleLength)
    : null
  const daysToPhaseChange = hasCycleView
    ? daysUntilPhaseChange(parseDate(cycleData!.lastPeriodDate), new Date(), cycleData!.cycleLength)
    : 0
  const daysToNextPeriod = hasCycleView
    ? Math.max(0, cycleData!.cycleLength - todayInfo!.dayOfCycle + 1)
    : 0

  const confidenceRange = prediction?.predictionRange?.plusMinusDays ?? 0
  const dateText = nextPeriodDate
    ? confidenceRange > 0
      ? `${nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (±${Math.round(confidenceRange)} days)`
      : nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  
  const insight = hasCycleView
    ? getHomeInsight(todayInfo!.dayOfCycle, cycleData!.cycleLength, todayInfo!.phase, t)
    : prediction?.symptomInsights[0]?.title || 'Tracking symptoms'

  const upcomingEvents: { label: string; date: string; icon: React.ReactNode; color: string }[] = []
  const today = new Date()
  
  if (hasCycleView && nextPeriodDate && daysToNextPeriod > 0 && daysToNextPeriod <= cycleData!.cycleLength) {
    upcomingEvents.push({
      label: daysToNextPeriod <= 1 ? t('home.periodExpectedTomorrow') : interpolate(t('home.periodInDays'), { days: daysToNextPeriod }),
      date: nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      icon: <Droplets className="h-4 w-4" />,
      color: 'text-red-500 bg-red-50',
    })
  }

  if (hasCycleView && ovulationDate && ovulationDate > today) {
    const daysToOvulation = Math.ceil((ovulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToOvulation <= 14) {
      upcomingEvents.push({
        label: daysToOvulation <= 1 ? t('home.ovulationExpectedTomorrow') : interpolate(t('home.ovulationInDays'), { days: daysToOvulation }),
        date: ovulationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: <Heart className="h-4 w-4" />,
        color: 'text-blue-500 bg-blue-50',
      })
    }
  }

  if (hasCycleView && todayInfo!.phase !== 'period') {
    upcomingEvents.push({
      label: interpolate(t('home.phaseChangeInDays'), { days: daysToPhaseChange }),
      date: '',
      icon: <Moon className="h-4 w-4" />,
      color: 'text-purple-500 bg-purple-50',
    })
  }

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] space-y-6 pb-4">
      <header className="flex items-center justify-between rounded-3xl bg-white/90 px-4 py-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {menopauseModeActive ? 'Tracking symptoms' : t('home.currentCycle')}
          </h1>
          {menopauseModeActive && (
            <p className="mt-1 text-sm text-orange-600">Menopause mode active</p>
          )}
        </div>
        <button
          type="button"
          className="rounded-2xl border border-teal-100 bg-teal-50 p-2 text-teal-700"
          aria-label={t('home.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="h-full rounded-[30px] bg-gradient-to-br from-rose-50 via-white to-cyan-50 px-4 py-8 shadow-[0_15px_40px_rgba(148,163,184,0.25)] transition-all duration-300 sm:px-8">
            {hasCycleView ? (
              <CycleCircle todayInfo={todayInfo!} cycleLength={cycleData!.cycleLength} />
            ) : (
              <div className="flex h-full min-h-[360px] flex-col justify-center rounded-[26px] border border-white/70 bg-white/70 p-8">
                <span className="inline-flex w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                  Menopause mode active
                </span>
                <h2 className="mt-5 text-3xl font-bold text-slate-900">Symptom-first tracking</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Cycle predictions are hidden for this stage. Your dashboard focuses on symptoms, sleep, mood, and notes so you can still spot patterns without relying on period timing.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Average sleep</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {prediction?.symptomSummary.averageSleepHours ? `${prediction.symptomSummary.averageSleepHours}h` : 'Not enough data'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recurring symptoms</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {prediction?.symptomSummary.recurringSymptoms.length
                        ? prediction.symptomSummary.recurringSymptoms.join(', ')
                        : 'No repeated symptom pattern yet'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <section className="rounded-3xl bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{insight}</p>
            <p className="mt-3 text-base text-slate-500">
              {hasCycleView && nextPeriodDate
                ? interpolate(t('home.nextPeriodExpectedAround'), { date: dateText })
                : prediction?.symptomInsights[0]?.message || 'Keep tracking symptoms, sleep, and mood to strengthen pattern detection.'
              }
            </p>
          </section>

          {prediction?.alertMessage && <HealthAlertCard message={prediction.alertMessage} />}

          <Link
            href="/tracking"
            className="flex items-center justify-between rounded-3xl border border-orange-100 bg-orange-50 px-5 py-6 text-slate-800 shadow-[0_10px_30px_rgba(251,146,60,0.12)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
                <Smile className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold">{t('home.feelToday')}</span>
            </div>
            <ArrowRight className="h-5 w-5 text-orange-600" />
          </Link>

          <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('home.quickActions')}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/calendar"
                className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-teal-50"
              >
                {t('dashboard.openCalendar')}
              </Link>
              <Link
                href="/analytics"
                className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-teal-50"
              >
                {t('home.viewAnalysis')}
              </Link>
            </div>
          </div>

          {menopauseModeActive && prediction?.symptomInsights.length ? (
            <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Symptom-based insights
              </h2>
              <div className="mt-4 space-y-3">
                {prediction.symptomInsights.map((item) => (
                  <div key={item.key} className="rounded-2xl bg-white/80 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!menopauseModeActive && upcomingEvents.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('home.upcoming')}</h2>
              <div className="space-y-3">
                {upcomingEvents.map((event, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${event.color}`}>
                      {event.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{event.label}</p>
                      {event.date && (
                        <p className="text-xs text-slate-500">{event.date}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasCycleView && (
            <div className="rounded-3xl border border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-6">
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {getPhaseEmoji(todayInfo!.phase)} {interpolate(t('home.phaseTip'), { phase: todayInfo!.phase.charAt(0).toUpperCase() + todayInfo!.phase.slice(1) })}
              </p>
              <p className="text-sm text-slate-600">
                {todayInfo!.phase === 'period' && t('home.periodTip')}
                {todayInfo!.phase === 'follicular' && t('home.follicularTip')}
                {todayInfo!.phase === 'ovulation' && t('home.ovulationTip')}
                {todayInfo!.phase === 'luteal' && t('home.lutealTip')}
              </p>
              <Link href="/insights" className="mt-3 inline-flex items-center text-xs font-medium text-teal-600 hover:text-teal-700">
                {t('home.viewAllInsights')} <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <HealthTimelineCard title="Unified health timeline" logs={recentLogs} />
      <MenopauseSupportCard />
    </div>
  )
}
