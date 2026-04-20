import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { recomputeCycleForUser, validateFlowEntryLength } from '@/lib/cycle-recalculation'
import { buildHybridPredictionForUser } from '@/lib/hybrid-prediction'

const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  flow: z.enum(['light', 'medium', 'heavy', 'super_heavy']).nullable().optional(),
  spotting: z.enum(['red', 'brown']).nullable().optional(),
  mood: z.array(z.string()).optional().default([]),
  symptoms: z.array(z.string()).optional().default([]),
  temperature: z.number().min(35).max(42).nullable().optional(),
  sleepQuality: z.enum(['good', 'fair', 'poor']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  isPeriodStart: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const { searchParams } = new URL(request.url)

    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '90', 10)

    const where: Record<string, unknown> = { userId: user.userId }

    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(`${from}T00:00:00`)
      if (to) (where.date as Record<string, unknown>).lte = new Date(`${to}T00:00:00`)
    }

    const logs = await prisma.dailyLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(limit, 365),
    })

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        flow: log.flow,
        spotting: log.spotting,
        mood: log.mood,
        symptoms: log.symptoms,
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
      })),
      count: logs.length,
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Get logs error', 'Failed to get logs')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const body = await request.json()
    const data = dailyLogSchema.parse(body)

    const logDate = new Date(`${data.date}T00:00:00`)
    const shouldValidateFlow = !!data.flow || data.isPeriodStart

    let normalizedFlow = data.flow || (data.isPeriodStart ? 'light' : null)
    let warning: string | null = null

    if (shouldValidateFlow) {
      const canSaveFlow = await validateFlowEntryLength(user.userId, logDate, 7)
      if (!canSaveFlow) {
        normalizedFlow = null
        warning = 'Flow not saved because period length exceeded the 7-day validation limit.'
      }
    }

    const log = await prisma.dailyLog.upsert({
      where: {
        userId_date: {
          userId: user.userId,
          date: logDate,
        },
      },
      create: {
        userId: user.userId,
        date: logDate,
        flow: normalizedFlow,
        spotting: data.spotting || null,
        mood: data.mood || [],
        symptoms: data.symptoms || [],
        temperature: data.temperature || null,
        sleepQuality: data.sleepQuality || null,
        notes: data.notes || null,
      },
      update: {
        flow: normalizedFlow,
        spotting: data.spotting || null,
        mood: data.mood || [],
        symptoms: data.symptoms || [],
        temperature: data.temperature || null,
        sleepQuality: data.sleepQuality || null,
        notes: data.notes || null,
      },
    })

    const recalc = await recomputeCycleForUser(user.userId, { persist: true })

    console.log(`[Logs API] User ${user.userId}: Cycle recalculation result`, {
      hasCycleData: recalc.hasCycleData,
      hasAnyLogs: recalc.hasAnyLogs,
      lastPeriodDate: recalc.lastPeriodDate,
      cycleLength: recalc.cycleLength,
      cycleStarts: recalc.cycleStarts.length,
      savedFlow: normalizedFlow,
      isPeriodStart: data.isPeriodStart,
      warning,
    })

    console.log(`[Logs API] User ${user.userId}: Daily log created/updated for ${data.date}`, {
      isPeriodStart: data.isPeriodStart,
      flow: normalizedFlow,
      cycleRecalculated: recalc.hasCycleData,
      lastPeriodDate: recalc.lastPeriodDate,
      cycleLength: recalc.cycleLength,
    })

    let hybridPrediction: Awaited<ReturnType<typeof buildHybridPredictionForUser>> | null = null
    try {
      hybridPrediction = await buildHybridPredictionForUser(user.userId, {
        includeExplanation: false,
        persist: true,
      })
      console.log(`[Logs API] User ${user.userId}: Prediction updated`, {
        predictedDate: hybridPrediction?.predictedPeriodDate,
        confidence: hybridPrediction?.confidence,
      })
    } catch (predictionError) {
      console.error('Hybrid prediction update failed after log save:', predictionError)
    }

    return NextResponse.json(
      {
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        flow: log.flow,
        spotting: log.spotting,
        mood: log.mood,
        symptoms: log.symptoms,
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        notes: log.notes,
        warning,
        cycle: {
          hasCycleData: recalc.hasCycleData,
          lastPeriodDate: recalc.lastPeriodDate,
          cycleLength: recalc.cycleLength,
          prediction:
            hybridPrediction
              ? {
                  predictedPeriodDate: hybridPrediction.predictedPeriodDate,
                  ovulationDate: hybridPrediction.ovulationDate,
                  fertileWindowStart: hybridPrediction.fertileWindowStart,
                  fertileWindowEnd: hybridPrediction.fertileWindowEnd,
                  confidence: hybridPrediction.confidence,
                  method: hybridPrediction.method,
                }
              : recalc.prediction,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Save log error', 'Failed to save log')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const logId = searchParams.get('id')

    if (!logId) {
      return NextResponse.json({ error: 'Missing log id' }, { status: 400 })
    }

    const log = await prisma.dailyLog.findUnique({ where: { id: logId } })

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    if (log.userId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.dailyLog.delete({ where: { id: logId } })

    const recalc = await recomputeCycleForUser(user.userId, { persist: true })

    let hybridPrediction: Awaited<ReturnType<typeof buildHybridPredictionForUser>> | null = null
    try {
      hybridPrediction = await buildHybridPredictionForUser(user.userId, {
        includeExplanation: false,
        persist: true,
      })
    } catch (predictionError) {
      console.error('Hybrid prediction update failed after log delete:', predictionError)
    }

    return NextResponse.json({
      success: true,
      cycle: {
        hasCycleData: recalc.hasCycleData,
        lastPeriodDate: recalc.lastPeriodDate,
        cycleLength: recalc.cycleLength,
        prediction:
          hybridPrediction
            ? {
                predictedPeriodDate: hybridPrediction.predictedPeriodDate,
                ovulationDate: hybridPrediction.ovulationDate,
                fertileWindowStart: hybridPrediction.fertileWindowStart,
                fertileWindowEnd: hybridPrediction.fertileWindowEnd,
                confidence: hybridPrediction.confidence,
                method: hybridPrediction.method,
              }
            : recalc.prediction,
      },
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Delete log error', 'Failed to delete log')
  }
}
