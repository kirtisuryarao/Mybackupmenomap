import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { computeAnalytics } from '@/lib/cycle-engine'

/**
 * GET /api/analytics - Get cycle statistics, trends, and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult

    // Get all cycles
    const cycles = await prisma.cycle.findMany({
      where: { userId: user.userId },
      orderBy: { startDate: 'asc' },
    })

    const cycleRecords = cycles.map(c => ({
      startDate: c.startDate,
      endDate: c.endDate,
      length: c.length,
      periodLength: c.periodLength,
    }))

    const analytics = computeAnalytics(cycleRecords)

    // Get mood trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentLogs = await prisma.dailyLog.findMany({
      where: {
        userId: user.userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        mood: true,
        symptoms: true,
        temperature: true,
        flow: true,
        sleepQuality: true,
      },
    })

    // Compute mood frequency
    const moodCounts: Record<string, number> = {}
    const symptomCounts: Record<string, number> = {}
    const temperatures: { date: string; temperature: number }[] = []

    for (const log of recentLogs) {
      for (const m of log.mood) {
        moodCounts[m] = (moodCounts[m] || 0) + 1
      }
      for (const s of log.symptoms) {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1
      }
      if (log.temperature) {
        temperatures.push({
          date: log.date.toISOString().split('T')[0],
          temperature: log.temperature,
        })
      }
    }

    // Get total log count
    const totalLogs = await prisma.dailyLog.count({
      where: { userId: user.userId },
    })

    return NextResponse.json({
      ...analytics,
      moodTrends: moodCounts,
      symptomTrends: symptomCounts,
      temperatureTrends: temperatures,
      totalLogsRecorded: totalLogs,
      recentLogs: recentLogs.map(l => ({
        date: l.date.toISOString().split('T')[0],
        mood: l.mood,
        symptoms: l.symptoms,
        temperature: l.temperature,
        flow: l.flow,
        sleepQuality: l.sleepQuality,
      })),
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Analytics error', 'Failed to get analytics')
  }
}
