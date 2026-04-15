'use client'

import { DayInfo } from '@/lib/cycle-calculations'

interface CycleCircleProps {
  todayInfo: DayInfo
  cycleLength: number
}

const PHASE_LABELS: Record<DayInfo['phase'], string> = {
  period: 'Period',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
}

export function CycleCircle({ todayInfo, cycleLength }: CycleCircleProps) {
  const ovulationDay = Math.floor(cycleLength / 2)
  const fertileStartDay = Math.max(1, ovulationDay - 4)
  const fertileEndDay = Math.min(cycleLength, ovulationDay + 1)
  const progressDeg = (todayInfo.dayOfCycle / cycleLength) * 360

  const periodStop = (5 / cycleLength) * 360
  const fertileStart = ((fertileStartDay - 1) / cycleLength) * 360
  const fertileEnd = (fertileEndDay / cycleLength) * 360

  const ringBackground = `conic-gradient(
    #fca5a5 0deg ${periodStop}deg,
    #e5e7eb ${periodStop}deg ${fertileStart}deg,
    #67e8f9 ${fertileStart}deg ${fertileEnd}deg,
    #e5e7eb ${fertileEnd}deg 360deg
  )`

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="relative mx-auto h-72 w-72 rounded-full bg-slate-50 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:h-80 sm:w-80">
        <div className="absolute inset-5 rounded-full" style={{ background: ringBackground }} />

        <div className="absolute inset-[34px] rounded-full bg-white shadow-inner" />

        <div
          className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-rose-500 shadow"
          style={{ transform: `translate(-50%, -50%) rotate(${progressDeg}deg) translateY(-122px)` }}
        />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-slate-500">Today</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">Day {todayInfo.dayOfCycle}</p>
          <p className="mt-2 rounded-full bg-teal-50 px-4 py-1 text-sm font-semibold text-teal-700">
            {PHASE_LABELS[todayInfo.phase]} phase
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="rounded-2xl bg-rose-50 px-3 py-2">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> Period window
        </div>
        <div className="rounded-2xl bg-cyan-50 px-3 py-2">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> Fertile window
        </div>
      </div>
    </div>
  )
}
