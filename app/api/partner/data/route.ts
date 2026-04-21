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

    // Fetch partner with user info
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cycleLength: true,
            periodDuration: true,
          },
        },
      },
    })

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Use shared utility to get FRESH cycle data - SAME SOURCE AS CALENDAR & AI
    const cycleData = await getCycleData(partner.userId)

    // Fetch latest prediction
    const prediction = await prisma.prediction.findFirst({
      where: { userId: partner.userId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    // Fetch recent daily logs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentLogs = await prisma.dailyLog.findMany({
      where: {
        userId: partner.userId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
      take: 30,
    })

    console.error(`[PartnerData] Partner ${partnerId} fetching data for user ${partner.userId}`, {
      hasCycleData: cycleData.hasCycleData,
      source: cycleData.source,
    })

    const consentScopes = consent.scopes as PartnerConsentScope[]
    const insights = cycleData.lastPeriodDate
      ? getPartnerInsights({
          userName: partner.user.name,
          lastPeriodDate: cycleData.lastPeriodDate,
          cycleLength: cycleData.cycleLength,
          periodLength: partner.user.periodDuration,
          recentLogs,
          consentScopes,
        })
      : null

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
      },
      linkedUser: partner.user,
      cycleData: {
        lastPeriodDate: cycleData.lastPeriodDate,
        cycleLength: cycleData.cycleLength,
        source: cycleData.source,
      },
      visibility: {
        cycle: true,
        mood: consentScopes.includes('mood'),
        symptoms: consentScopes.includes('symptoms'),
        notes: consentScopes.includes('notes'),
      },
      prediction: prediction
        ? {
            predictedPeriodDate: prediction.predictedPeriodDate,
            ovulationDate: prediction.ovulationDate,
            fertileWindowStart: prediction.fertileWindowStart,
            fertileWindowEnd: prediction.fertileWindowEnd,
            confidence: prediction.confidence,
          }
        : cycleData.prediction,
      insights,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        date: log.date,
        flow: log.flow,
        spotting: log.spotting,
        mood: consentScopes.includes('mood') ? log.mood : [],
        symptoms: consentScopes.includes('symptoms') ? log.symptoms : [],
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        notes: consentScopes.includes('notes') ? log.notes : null,
      })),
    })
  } catch (error: any) {
    console.error('Partner data fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partner data' },
      { status: 500 }
    )
  }
}
