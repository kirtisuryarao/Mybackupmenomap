'use client'

import Link from 'next/link'
import { ArrowRight, Menu, Smile, Calendar, TrendingUp, Droplets, Heart, Moon } from 'lucide-react'
import { useCycleData } from '@/hooks/use-cycle-data'
import { usePrediction } from '@/hooks/use-prediction'
import { parseDate, getNextPeriodDate, getOvulationDate, daysUntilPhaseChange } from '@/lib/cycle-calculations'
import { CycleCircle } from '@/components/CycleCircle'

function getHomeInsight(dayOfCycle: number, cycleLength: number, phase: string): string {
  if (dayOfCycle <= 5) {
    return 'Your period is in progress'
  }

  const daysUntilNextPeriod = Math.max(0, cycleLength - dayOfCycle + 1)

  if (daysUntilNextPeriod <= 3) {
    return `Your period is ${daysUntilNextPeriod} day${daysUntilNextPeriod === 1 ? '' : 's'} away`
  }

  if (phase === 'luteal') {
    return 'You are in late luteal phase'
  }

  if (phase === 'ovulation') {
    return 'You are likely ovulating today'
  }

  return 'Your cycle is progressing steadily'
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'period': return 'text-red-500'
    case 'follicular': return 'text-yellow-600'
    case 'ovulation': return 'text-blue-500'
    case 'luteal': return 'text-purple-500'
    default: return 'text-slate-600'
  }
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
  const { cycleData, todayInfo, isLoading: cycleLoading } = useCycleData()
  const { prediction, isLoading: predictionLoading } = usePrediction()

  const isLoading = cycleLoading || predictionLoading

  // Debug logging
  console.log('[HomePage] Render state:', {
    cycleLoading,
    predictionLoading,
    hasCycleData: !!cycleData,
    hasTodayInfo: !!todayInfo,
    hasPrediction: !!prediction,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="mx-auto h-72 w-72 animate-pulse rounded-full bg-slate-100" />
      </div>
    )
  }

  if (!cycleData || !todayInfo) {
    console.log('[HomePage] No cycle data available, showing empty state')
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] space-y-6 pb-4">
        <header className="flex items-center justify-between rounded-3xl bg-white/90 px-4 py-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Your current cycle</h1>
          <button
            type="button"
            className="rounded-2xl border border-teal-100 bg-teal-50 p-2 text-teal-700"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <section className="rounded-3xl bg-white p-8 text-center shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          <p className="text-lg font-semibold text-slate-900">No cycle data yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Start by logging your period from Track or by tapping a date in Calendar.
          </p>
          <Link
            href="/tracking"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            Add first log
          </Link>
        </section>
      </div>
    )
  }

  const nextPeriodDate = prediction
    ? new Date(prediction.predictedPeriodDate)
    : getNextPeriodDate(parseDate(cycleData.lastPeriodDate), cycleData.cycleLength)
  
  const ovulationDate = getOvulationDate(parseDate(cycleData.lastPeriodDate), cycleData.cycleLength)
  const daysToPhaseChange = daysUntilPhaseChange(parseDate(cycleData.lastPeriodDate), new Date(), cycleData.cycleLength)
  const daysToNextPeriod = Math.max(0, cycleData.cycleLength - todayInfo.dayOfCycle + 1)

  const confidenceRange = prediction?.predictionRange.plusMinusDays ?? 0
  const dateText = confidenceRange > 0
    ? `${nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (±${Math.round(confidenceRange)} days)`
    : nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  
  const insight = getHomeInsight(todayInfo.dayOfCycle, cycleData.cycleLength, todayInfo.phase)

  // Build upcoming events list (Clue-style)
  const upcomingEvents: { label: string; date: string; icon: React.ReactNode; color: string }[] = []
  const today = new Date()
  
  if (daysToNextPeriod > 0 && daysToNextPeriod <= cycleData.cycleLength) {
    upcomingEvents.push({
      label: daysToNextPeriod <= 1 ? 'Period expected tomorrow' : `Period in ${daysToNextPeriod} days`,
      date: nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      icon: <Droplets className="h-4 w-4" />,
      color: 'text-red-500 bg-red-50',
    })
  }

  if (ovulationDate > today) {
    const daysToOvulation = Math.ceil((ovulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToOvulation <= 14) {
      upcomingEvents.push({
        label: daysToOvulation <= 1 ? 'Ovulation expected tomorrow' : `Ovulation in ${daysToOvulation} days`,
        date: ovulationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: <Heart className="h-4 w-4" />,
        color: 'text-blue-500 bg-blue-50',
      })
    }
  }

  if (todayInfo.phase !== 'period') {
    upcomingEvents.push({
      label: `Phase change in ${daysToPhaseChange} days`,
      date: '',
      icon: <Moon className="h-4 w-4" />,
      color: 'text-purple-500 bg-purple-50',
    })
  }

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] space-y-6 pb-4">
      <header className="flex items-center justify-between rounded-3xl bg-white/90 px-4 py-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Your current cycle</h1>
        <button
          type="button"
          className="rounded-2xl border border-teal-100 bg-teal-50 p-2 text-teal-700"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="h-full rounded-[30px] bg-gradient-to-br from-rose-50 via-white to-cyan-50 px-4 py-8 shadow-[0_15px_40px_rgba(148,163,184,0.25)] transition-all duration-300 sm:px-8">
            <CycleCircle todayInfo={todayInfo} cycleLength={cycleData.cycleLength} />
          </div>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <section className="rounded-3xl bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{insight}</p>
            <p className="mt-3 text-base text-slate-500">
              {prediction 
                ? `Your next period is expected around ${dateText}`
                : `Expected next period around ${dateText}`
              }
            </p>
          </section>

          <Link
            href="/tracking"
            className="flex items-center justify-between rounded-3xl border border-orange-100 bg-orange-50 px-5 py-6 text-slate-800 shadow-[0_10px_30px_rgba(251,146,60,0.12)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
                <Smile className="h-4 w-4" />
              </span>
              <span className="text-lg font-semibold">How do you feel today?</span>
            </div>
            <ArrowRight className="h-5 w-5 text-orange-600" />
          </Link>

          <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/calendar"
                className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-teal-50"
              >
                Open calendar
              </Link>
              <Link
                href="/analytics"
                className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-teal-50"
              >
                View analysis
              </Link>
            </div>
          </div>

          {/* Upcoming Events (Clue-style) */}
          {upcomingEvents.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming</h2>
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

          {/* Phase-specific tip */}
          <div className="rounded-3xl border border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-6">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {getPhaseEmoji(todayInfo.phase)} {todayInfo.phase.charAt(0).toUpperCase() + todayInfo.phase.slice(1)} Phase Tip
            </p>
            <p className="text-sm text-slate-600">
              {todayInfo.phase === 'period' && 'Focus on rest and iron-rich foods. Gentle stretching can help with cramps.'}
              {todayInfo.phase === 'follicular' && 'Energy is rising! Great time for new projects and high-intensity workouts.'}
              {todayInfo.phase === 'ovulation' && 'Peak energy and confidence. Perfect for social activities and important tasks.'}
              {todayInfo.phase === 'luteal' && 'Energy may dip. Focus on self-care, magnesium-rich foods, and calming activities.'}
            </p>
            <Link href="/insights" className="mt-3 inline-flex items-center text-xs font-medium text-teal-600 hover:text-teal-700">
              View all insights <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>

          {/* Health Library Link */}
          <Link
            href="/learn/menstrual-cycle"
            className="flex items-center justify-between rounded-3xl border border-rose-100 bg-rose-50 px-5 py-6 text-slate-800 shadow-[0_10px_30px_rgba(244,63,94,0.12)] transition-all duration-300 hover:-translate-y-0.5 mt-6"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white">
                <Heart className="h-4 w-4" />
              </span>
              <div>
                <span className="text-sm font-semibold text-rose-500 block mb-0.5">Health Library</span>
                <span className="text-lg font-bold text-slate-800">The Menstrual Cycle Explained</span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-rose-600" />
          </Link>
        </div>
      </div>
    </div>
  )
}
