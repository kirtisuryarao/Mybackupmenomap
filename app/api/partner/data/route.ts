import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validatePartnerRequest } from '@/lib/partner-auth'

export async function GET(request: NextRequest) {
  try {
    const { partnerId, error } = await validatePartnerRequest(request)

    if (!partnerId || error) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
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

    // Fetch user's latest cycle data
    const latestCycleEntry = await prisma.cycleEntry.findFirst({
      where: { userId: partner.userId },
      orderBy: { lastPeriodDate: 'desc' },
      take: 1,
    })

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

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
      },
      linkedUser: partner.user,
      cycleData: {
        lastPeriodDate: latestCycleEntry?.lastPeriodDate || null,
        cycleLength: latestCycleEntry?.cycleLength || partner.user.cycleLength,
      },
      prediction: prediction
        ? {
            predictedPeriodDate: prediction.predictedPeriodDate,
            ovulationDate: prediction.ovulationDate,
            fertileWindowStart: prediction.fertileWindowStart,
            fertileWindowEnd: prediction.fertileWindowEnd,
            confidence: prediction.confidence,
          }
        : null,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        date: log.date,
        flow: log.flow,
        spotting: log.spotting,
        mood: log.mood,
        symptoms: log.symptoms,
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        notes: log.notes,
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
