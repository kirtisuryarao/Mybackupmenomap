import { NextRequest, NextResponse } from 'next/server'

import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import { findFileUserById } from '@/lib/file-auth-store'
import { findFilePartnerById } from '@/lib/file-partner-store'
import { logger } from '@/lib/logger'
import { validatePartnerRequest } from '@/lib/partner-auth'
import { prisma } from '@/lib/prisma'
import { assertPartnerConsent } from '@/lib/services/consent-service'

export interface CycleInsightsResponse {
  user_name: string
  current_day: number
  phase: string
  ovulation_day: number
  ovulation_date: string
  days_until_ovulation: number
  fertile_window: [number, number]
  safe_days: number[]
  unsafe_days: number[]
  next_period_date: string
  days_until_next_period: number
  cycle_length: number
  period_length: number
  cycle_start_date: string
}

function computeCycleInsights(
  lastPeriodDate: Date,
  cycleLength: number,
  periodLength: number,
): Omit<CycleInsightsResponse, 'user_name'> {
  const cl = Math.max(20, Math.min(60, Math.round(cycleLength)))
  const pl = Math.max(1, Math.min(periodLength, cl - 15))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lp = new Date(lastPeriodDate)
  lp.setHours(0, 0, 0, 0)

  // How many complete cycles have elapsed since the last period date?
  const daysSinceLp = Math.floor((today.getTime() - lp.getTime()) / 86_400_000)
  const cyclesElapsed = Math.max(0, Math.floor(daysSinceLp / cl))

  // Start of the current cycle
  const cycleStart = new Date(lp.getTime() + cyclesElapsed * cl * 86_400_000)
  cycleStart.setHours(0, 0, 0, 0)

  const dayOfCycle =
    Math.floor((today.getTime() - cycleStart.getTime()) / 86_400_000) + 1

  // Biological: ovulation = cycleLength - 14 (1-indexed)
  const ovulationDay = Math.max(pl + 1, cl - 14)

  // Fertile window: ovDay-5 to ovDay+1
  const fertileWindowStart = Math.max(1, ovulationDay - 5)
  const fertileWindowEnd = Math.min(cl, ovulationDay + 1)

  // Classify each day of the cycle
  const safeDays: number[] = []
  const unsafeDays: number[] = []
  for (let d = 1; d <= cl; d++) {
    if (d >= fertileWindowStart && d <= fertileWindowEnd) {
      unsafeDays.push(d)
    } else {
      safeDays.push(d)
    }
  }

  // Phase
  let phase: string
  if (dayOfCycle <= pl) phase = 'Period'
  else if (dayOfCycle < ovulationDay) phase = 'Follicular'
  else if (dayOfCycle === ovulationDay) phase = 'Ovulation'
  else phase = 'Luteal'

  // Actual dates
  const nextPeriodDate = new Date(cycleStart.getTime() + cl * 86_400_000)
  const ovulationDate = new Date(cycleStart.getTime() + (ovulationDay - 1) * 86_400_000)

  const daysUntilNextPeriod = Math.floor(
    (nextPeriodDate.getTime() - today.getTime()) / 86_400_000,
  )
  const daysUntilOvulation = Math.floor(
    (ovulationDate.getTime() - today.getTime()) / 86_400_000,
  )

  return {
    current_day: dayOfCycle,
    phase,
    ovulation_day: ovulationDay,
    ovulation_date: ovulationDate.toISOString().split('T')[0],
    days_until_ovulation: daysUntilOvulation,
    fertile_window: [fertileWindowStart, fertileWindowEnd],
    safe_days: safeDays,
    unsafe_days: unsafeDays,
    next_period_date: nextPeriodDate.toISOString().split('T')[0],
    days_until_next_period: daysUntilNextPeriod,
    cycle_length: cl,
    period_length: pl,
    cycle_start_date: cycleStart.toISOString().split('T')[0],
  }
}

export async function GET(request: NextRequest) {
  try {
    const { partnerId, error } = await validatePartnerRequest(request)

    if (!partnerId || error) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const consent = await assertPartnerConsent(partnerId, ['cycle'])
    if (!consent.allowed) {
      return NextResponse.json({ error: consent.error }, { status: consent.status })
    }

    try {
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              cycleLength: true,
              periodDuration: true,
            },
          },
        },
      })

      if (!partner) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
      }

      // Get the most recent cycle entry for an accurate lastPeriodDate
      const latestEntry = await prisma.cycleEntry.findFirst({
        where: { userId: partner.userId },
        orderBy: { lastPeriodDate: 'desc' },
        take: 1,
      })

      const lastPeriodDate = latestEntry?.lastPeriodDate ?? null
      if (!lastPeriodDate) {
        return NextResponse.json(
          { error: 'No cycle data available yet' },
          { status: 404 },
        )
      }

      const cycleLength = latestEntry?.cycleLength ?? partner.user.cycleLength ?? 28
      const periodLength = partner.user.periodDuration ?? 5

      const insights = computeCycleInsights(lastPeriodDate, cycleLength, periodLength)

      return NextResponse.json({
        user_name: partner.user.name,
        ...insights,
      } satisfies CycleInsightsResponse)
    } catch (dbError) {
      if (isPrismaConnectionError(dbError) && canUseFileAuthFallback()) {
        const filePartner = await findFilePartnerById(partnerId)
        if (!filePartner) {
          return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
        }

        const fileUser = await findFileUserById(filePartner.userId)
        if (!fileUser?.lastPeriodDate) {
          return NextResponse.json(
            { error: 'No cycle data available yet' },
            { status: 404 },
          )
        }

        const cycleLength = fileUser.cycleLength ?? 28
        const periodLength = fileUser.periodDuration ?? 5

        const insights = computeCycleInsights(
          new Date(fileUser.lastPeriodDate),
          cycleLength,
          periodLength,
        )

        return NextResponse.json({
          user_name: fileUser.name,
          ...insights,
        } satisfies CycleInsightsResponse)
      }
      throw dbError
    }
  } catch (err) {
    logger.error({ event: 'partner.cycle_insights', status: 'failure' }, err)
    return NextResponse.json({ error: 'Failed to fetch cycle insights' }, { status: 500 })
  }
}
