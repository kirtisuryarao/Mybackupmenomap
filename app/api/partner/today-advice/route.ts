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
      advice: insights.support_advice,
      actions: insights.support_actions,
      alerts: insights.alerts,
      warnings: insights.warnings,
      relationshipInsights: insights.relationship_insights,
      supportScore: insights.support_score,
      phase: insights.phase,
      fertilityStatus: insights.fertility_status,
      nextPeriodDate: insights.next_period_date,
    })
  } catch (error) {
    console.error('Partner today advice error:', error)
    return NextResponse.json({ error: 'Failed to fetch partner advice' }, { status: 500 })
  }
}