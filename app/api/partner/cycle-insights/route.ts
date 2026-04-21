import { NextRequest, NextResponse } from 'next/server'

import { getCycleData } from '@/lib/get-cycle-data'
import { validatePartnerRequest } from '@/lib/partner-auth'
import { prisma } from '@/lib/prisma'
import { assertPartnerConsent } from '@/lib/services/consent-service'
import { getPartnerInsights, type PartnerConsentScope } from '@/lib/services/partner-insights'

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

    const cycleData = await getCycleData(partner.userId)
    if (!cycleData.lastPeriodDate) {
      return NextResponse.json({ error: 'No cycle data available yet' }, { status: 404 })
    }

    const recentLogs = await prisma.dailyLog.findMany({
      where: { userId: partner.userId },
      orderBy: { date: 'desc' },
      take: 45,
    })

    const insights = getPartnerInsights({
      userName: partner.user.name,
      lastPeriodDate: cycleData.lastPeriodDate,
      cycleLength: cycleData.cycleLength || partner.user.cycleLength,
      periodLength: partner.user.periodDuration,
      recentLogs,
      consentScopes: consent.scopes as PartnerConsentScope[],
    })

    return NextResponse.json({
      user_name: partner.user.name,
      current_day: insights.current_day,
      phase: insights.phase,
      ovulation_day: insights.ovulation_day,
      ovulation_date: insights.ovulation_date,
      fertile_window: insights.fertile_window,
      next_period_date: insights.next_period_date,
      days_until_next_period: insights.days_to_next_period,
      cycle_length: cycleData.cycleLength || partner.user.cycleLength,
      period_length: partner.user.periodDuration,
      fertility_status: insights.fertility_status,
      is_safe_day: insights.is_safe_day,
      is_fertile: insights.is_fertile,
      support_advice: insights.support_advice,
      warnings: insights.warnings,
    })
  } catch (error) {
    console.error('Partner cycle insights error:', error)
    return NextResponse.json({ error: 'Failed to fetch cycle insights' }, { status: 500 })
  }
}