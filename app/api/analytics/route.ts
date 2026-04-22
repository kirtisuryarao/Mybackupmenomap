import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { getCyclePhase } from '@/lib/cycle-calculations'
import {
  computeAnalytics,
  computeCurrentPeriodLengthFromLogs,
  computePeriodLengthsFromLogs,
} from '@/lib/cycle-engine'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

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

    // Also compute period lengths directly from DailyLog flow entries
    // This is more accurate than relying solely on pre-computed Cycle records
    const allFlowLogs = await prisma.dailyLog.findMany({
      where: {
        userId: user.userId,
        flow: { not: null },
      },
      orderBy: { date: 'asc' },
      select: { date: true, flow: true },
    })

    const logBasedPeriods = computePeriodLengthsFromLogs(allFlowLogs)
    const currentPeriod = computeCurrentPeriodLengthFromLogs(allFlowLogs)

    // Use log-based period data when it's more complete than cycle-table data
    if (logBasedPeriods.periodLengths.length > 0) {
      analytics.periodLengths = logBasedPeriods.periodLengths
      analytics.avgPeriodLength = Math.round(logBasedPeriods.avgPeriodLength)
    }

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

    // Symptom-phase correlation: which symptoms appear most in each phase
    const phaseSymptoms: Record<string, Record<string, number>> = {
      period: {},
      follicular: {},
      ovulation: {},
      luteal: {},
    }
    const phaseMoods: Record<string, Record<string, number>> = {
      period: {},
      follicular: {},
      ovulation: {},
      luteal: {},
    }

    // Sort cycles by startDate for phase calculation
    const sortedCycles = [...cycles].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

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

      // Calculate phase for this log date to build correlation
      if (sortedCycles.length > 0) {
        let refDate = sortedCycles[0].startDate
        for (const c of sortedCycles) {
          if (c.startDate <= log.date) refDate = c.startDate
          else break
        }
        const dayDiff = Math.floor(
          (log.date.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const avgLen = analytics.avgCycleLength || 28
        const dayOfCycle = ((dayDiff % avgLen) + avgLen) % avgLen + 1
        const phase = getCyclePhase(dayOfCycle, avgLen)

        for (const s of log.symptoms) {
          phaseSymptoms[phase][s] = (phaseSymptoms[phase][s] || 0) + 1
        }
        for (const m of log.mood) {
          phaseMoods[phase][m] = (phaseMoods[phase][m] || 0) + 1
        }
      }
    }

    // Get total log count
    const totalLogs = await prisma.dailyLog.count({
      where: { userId: user.userId },
    })

    return NextResponse.json({
      ...analytics,
      currentPeriodLength: currentPeriod.currentPeriodLength,
      latestPeriodLength: currentPeriod.latestPeriodLength,
      isCurrentlyBleeding: currentPeriod.isCurrentlyBleeding,
      moodTrends: moodCounts,
      symptomTrends: symptomCounts,
      temperatureTrends: temperatures,
      totalLogsRecorded: totalLogs,
      phaseSymptomCorrelation: phaseSymptoms,
      phaseMoodCorrelation: phaseMoods,
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
