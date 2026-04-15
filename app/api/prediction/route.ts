import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import {
  predictNextCycle,
  weightedAverageCycleLength,
} from '@/lib/cycle-engine'

/**
 * GET /api/prediction - Get next period prediction, ovulation, fertile window
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult

    // Check for stored prediction
    const storedPrediction = await prisma.prediction.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })

    if (storedPrediction) {
      return NextResponse.json({
        predictedPeriodDate: storedPrediction.predictedPeriodDate.toISOString().split('T')[0],
        ovulationDate: storedPrediction.ovulationDate.toISOString().split('T')[0],
        fertileWindowStart: storedPrediction.fertileWindowStart.toISOString().split('T')[0],
        fertileWindowEnd: storedPrediction.fertileWindowEnd.toISOString().split('T')[0],
        confidence: storedPrediction.confidence,
        method: storedPrediction.method,
      })
    }

    // Fallback: compute from cycle entries if no prediction stored
    const cycles = await prisma.cycle.findMany({
      where: { userId: user.userId },
      orderBy: { startDate: 'asc' },
    })

    if (cycles.length > 0) {
      const cycleRecords = cycles.map(c => ({
        startDate: c.startDate,
        endDate: c.endDate,
        length: c.length,
        periodLength: c.periodLength,
      }))

      const avgLength = weightedAverageCycleLength(cycleRecords)
      const lastStart = cycles[cycles.length - 1].startDate
      const prediction = predictNextCycle(lastStart, avgLength, cycles.length)

      return NextResponse.json({
        predictedPeriodDate: prediction.predictedPeriodDate.toISOString().split('T')[0],
        ovulationDate: prediction.ovulationDate.toISOString().split('T')[0],
        fertileWindowStart: prediction.fertileWindowStart.toISOString().split('T')[0],
        fertileWindowEnd: prediction.fertileWindowEnd.toISOString().split('T')[0],
        confidence: prediction.confidence,
        method: prediction.method,
      })
    }

    // Fallback to basic CycleEntry data
    const latestEntry = await prisma.cycleEntry.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { cycleLength: true },
    })

    const cycleLength = userData?.cycleLength || 28
    const lastPeriod = latestEntry?.lastPeriodDate || new Date()

    const prediction = predictNextCycle(lastPeriod, cycleLength, 1)

    return NextResponse.json({
      predictedPeriodDate: prediction.predictedPeriodDate.toISOString().split('T')[0],
      ovulationDate: prediction.ovulationDate.toISOString().split('T')[0],
      fertileWindowStart: prediction.fertileWindowStart.toISOString().split('T')[0],
      fertileWindowEnd: prediction.fertileWindowEnd.toISOString().split('T')[0],
      confidence: prediction.confidence,
      method: prediction.method,
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Prediction error', 'Failed to get prediction')
  }
}
