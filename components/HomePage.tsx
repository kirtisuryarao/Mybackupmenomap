'use client'

import Link from 'next/link'
import { ArrowRight, Menu, Smile } from 'lucide-react'
import { useCycleData } from '@/hooks/use-cycle-data'
import { parseDate, getNextPeriodDate } from '@/lib/cycle-calculations'
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

export function HomePage() {
  const { cycleData, todayInfo, isLoading } = useCycleData()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="mx-auto h-72 w-72 animate-pulse rounded-full bg-slate-100" />
      </div>
    )
  }

  if (!cycleData || !todayInfo) {
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

  const nextPeriodDate = getNextPeriodDate(parseDate(cycleData.lastPeriodDate), cycleData.cycleLength)
  const dateText = nextPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const insight = getHomeInsight(todayInfo.dayOfCycle, cycleData.cycleLength, todayInfo.phase)

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
            <p className="mt-3 text-base text-slate-500">Expected next period around {dateText}</p>
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
        </div>
      </div>
    </div>
  )
}
