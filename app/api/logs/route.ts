import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { recomputeCycleForUser, validateFlowEntryLength } from '@/lib/cycle-recalculation'
import { buildHybridPredictionForUser } from '@/lib/hybrid-prediction'
import { isMenopauseMode, normalizeSymptoms } from '@/lib/menopause'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  flow: z.enum(['light', 'medium', 'heavy', 'super_heavy']).nullable().optional(),
  spotting: z.enum(['red', 'brown']).nullable().optional(),
  mood: z.array(z.string()).optional().default([]),
  symptoms: z.array(z.string()).optional().default([]),
  temperature: z.number().min(35).max(42).nullable().optional(),
  sleepQuality: z.enum(['good', 'fair', 'poor']).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
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

    const [logs, healthLogs] = await Promise.all([
      prisma.dailyLog.findMany({
        where,
        orderBy: { date: 'desc' },
        take: Math.min(limit, 365),
      }),
      prisma.healthLog.findMany({
        where,
        orderBy: { date: 'desc' },
        take: Math.min(limit, 365),
      }),
    ])

    const merged = new Map<string, {
      id: string
      dailyLogId: string | null
      healthLogId: string | null
      date: string
      flow: string | null
      spotting: string | null
      mood: string[]
      moodText: string | null
      symptoms: string[]
      temperature: number | null
      sleepQuality: string | null
      sleepHours: number | null
      notes: string | null
      createdAt: string
    }>()

    for (const log of logs) {
      const date = log.date.toISOString().split('T')[0]
      merged.set(date, {
        id: log.id,
        dailyLogId: log.id,
        healthLogId: null,
        date,
        flow: log.flow,
        spotting: log.spotting,
        mood: log.mood,
        moodText: log.mood[0] || null,
        symptoms: log.symptoms,
        temperature: log.temperature,
        sleepQuality: log.sleepQuality,
        sleepHours: null,
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
      })
    }

    for (const healthLog of healthLogs) {
      const date = healthLog.date.toISOString().split('T')[0]
      const existing = merged.get(date)
      const symptoms = normalizeSymptoms(healthLog.symptoms)
      const notes = healthLog.notes || existing?.notes || null

      merged.set(date, {
        id: existing?.id || healthLog.id,
        dailyLogId: existing?.dailyLogId || null,
        healthLogId: healthLog.id,
        date,
        flow: existing?.flow || null,
        spotting: existing?.spotting || null,
        mood: existing?.mood?.length ? existing.mood : healthLog.mood ? [healthLog.mood] : [],
        moodText: healthLog.mood || existing?.moodText || null,
        symptoms: Array.from(new Set([...(existing?.symptoms || []), ...symptoms])),
        temperature: existing?.temperature || null,
        sleepQuality: existing?.sleepQuality || null,
        sleepHours: healthLog.sleepHours ?? existing?.sleepHours ?? null,
        notes,
        createdAt: existing?.createdAt || healthLog.createdAt.toISOString(),
      })
    }

    const mergedLogs = Array.from(merged.values()).sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({
      logs: mergedLogs,
      count: mergedLogs.length,
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

    const [profile, log] = await prisma.$transaction(async (tx) => {
      const userProfile = await tx.user.findUnique({
        where: { id: user.userId },
        select: { menopauseStage: true },
      })

      const dailyLog = await tx.dailyLog.upsert({
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

      await tx.healthLog.upsert({
        where: {
          userId_date: {
            userId: user.userId,
            date: logDate,
          },
        },
        create: {
          userId: user.userId,
          date: logDate,
          symptoms: data.symptoms || [],
          mood: data.mood[0] || null,
          sleepHours: data.sleepHours || null,
          notes: data.notes || null,
        },
        update: {
          symptoms: data.symptoms || [],
          mood: data.mood[0] || null,
          sleepHours: data.sleepHours || null,
          notes: data.notes || null,
        },
      })

      return [userProfile, dailyLog] as const
    })

    const recalc = await recomputeCycleForUser(user.userId, { persist: true })

    console.error(`[Logs API] User ${user.userId}: Cycle recalculation result`, {
      hasCycleData: recalc.hasCycleData,
      hasAnyLogs: recalc.hasAnyLogs,
      lastPeriodDate: recalc.lastPeriodDate,
      cycleLength: recalc.cycleLength,
      cycleStarts: recalc.cycleStarts.length,
      savedFlow: normalizedFlow,
      isPeriodStart: data.isPeriodStart,
      warning,
    })

    console.error(`[Logs API] User ${user.userId}: Daily log created/updated for ${data.date}`, {
      isPeriodStart: data.isPeriodStart,
      flow: normalizedFlow,
      cycleRecalculated: recalc.hasCycleData,
      lastPeriodDate: recalc.lastPeriodDate,
      cycleLength: recalc.cycleLength,
    })

    let hybridPrediction: Awaited<ReturnType<typeof buildHybridPredictionForUser>> | null = null
    if (!isMenopauseMode(profile?.menopauseStage)) {
      try {
        hybridPrediction = await buildHybridPredictionForUser(user.userId, {
          includeExplanation: false,
          persist: true,
        })
        console.error(`[Logs API] User ${user.userId}: Prediction updated`, {
          predictedDate: hybridPrediction?.predictedPeriodDate,
          confidence: hybridPrediction?.confidence,
        })
      } catch (predictionError) {
        console.error('Hybrid prediction update failed after log save:', predictionError)
      }
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
        sleepHours: data.sleepHours || null,
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

    const [dailyLog, healthLog] = await Promise.all([
      prisma.dailyLog.findUnique({ where: { id: logId } }),
      prisma.healthLog.findUnique({ where: { id: logId } }),
    ])

    const date = dailyLog?.date || healthLog?.date

    if (!date) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    }

    const ownerId = dailyLog?.userId || healthLog?.userId

    if (ownerId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { menopauseStage: true },
    })

    await prisma.$transaction([
      prisma.dailyLog.deleteMany({ where: { userId: user.userId, date } }),
      prisma.healthLog.deleteMany({ where: { userId: user.userId, date } }),
    ])

    const recalc = await recomputeCycleForUser(user.userId, { persist: true })

    let hybridPrediction: Awaited<ReturnType<typeof buildHybridPredictionForUser>> | null = null
    if (!isMenopauseMode(profile?.menopauseStage)) {
      try {
        hybridPrediction = await buildHybridPredictionForUser(user.userId, {
          includeExplanation: false,
          persist: true,
        })
      } catch (predictionError) {
        console.error('Hybrid prediction update failed after log delete:', predictionError)
      }
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
