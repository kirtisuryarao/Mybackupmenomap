import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { z } from 'zod'
import {
  detectCycleStarts,
  buildCycleRecords,
  weightedAverageCycleLength,
  predictNextCycle,
} from '@/lib/cycle-engine'

// Validation schema for daily log
const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  flow: z.enum(['light', 'medium', 'heavy', 'super_heavy']).nullable().optional(),
  spotting: z.enum(['red', 'brown']).nullable().optional(),
  mood: z.array(z.string()).optional().default([]),
  symptoms: z.array(z.string()).optional().default([]),
  temperature: z.number().min(35).max(42).nullable().optional(),
  sleepQuality: z.enum(['good', 'fair', 'poor']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

/**
 * GET /api/logs - Get user's daily logs
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=30
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '90')

    const where: Record<string, unknown> = { userId: user.userId }
    
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }

    const logs = await prisma.dailyLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(limit, 365),
    })

    return NextResponse.json({
      logs: logs.map(log => ({
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

/**
 * POST /api/logs - Add or update a daily log
 * Upserts based on user_id + date (one log per day per user)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const body = await request.json()
    const data = dailyLogSchema.parse(body)

    const logDate = new Date(data.date)

    // Upsert: create or update log for this date
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
        flow: data.flow || null,
        spotting: data.spotting || null,
        mood: data.mood || [],
        symptoms: data.symptoms || [],
        temperature: data.temperature || null,
        sleepQuality: data.sleepQuality || null,
        notes: data.notes || null,
      },
      update: {
        flow: data.flow || null,
        spotting: data.spotting || null,
        mood: data.mood || [],
        symptoms: data.symptoms || [],
        temperature: data.temperature || null,
        sleepQuality: data.sleepQuality || null,
        notes: data.notes || null,
      },
    })

    // After saving log, recalculate cycles and predictions if flow data changed
    if (data.flow) {
      await recalculateCyclesAndPredictions(user.userId)
    }

    return NextResponse.json({
      id: log.id,
      date: log.date.toISOString().split('T')[0],
      flow: log.flow,
      spotting: log.spotting,
      mood: log.mood,
      symptoms: log.symptoms,
      temperature: log.temperature,
      sleepQuality: log.sleepQuality,
      notes: log.notes,
    }, { status: 201 })
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

/**
 * Recalculate cycles and predictions whenever new period data is logged.
 * This is the core "dynamic behavior" requirement.
 */
async function recalculateCyclesAndPredictions(userId: string) {
  try {
    // Fetch all logs with flow data
    const flowLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        flow: { not: null },
      },
      orderBy: { date: 'asc' },
      select: { date: true, flow: true, spotting: true },
    })

    if (flowLogs.length === 0) return

    // Detect cycle starts from flow logs
    const starts = detectCycleStarts(
      flowLogs.map(l => ({
        date: l.date,
        flow: l.flow,
        spotting: l.spotting,
      }))
    )

    if (starts.length === 0) return

    // Build cycle records
    const allLogs = flowLogs.map(l => ({
      date: l.date,
      flow: l.flow,
      spotting: l.spotting,
    }))
    const cycleRecords = buildCycleRecords(starts, allLogs)

    // Clear old cycles and save new ones
    await prisma.cycle.deleteMany({ where: { userId } })

    for (const record of cycleRecords) {
      await prisma.cycle.create({
        data: {
          userId,
          startDate: record.startDate,
          endDate: record.endDate,
          length: record.length,
          periodLength: record.periodLength,
        },
      })
    }

    // Calculate weighted average cycle length
    const avgCycleLength = weightedAverageCycleLength(cycleRecords)

    // Update user's cycle length
    await prisma.user.update({
      where: { id: userId },
      data: { cycleLength: avgCycleLength },
    })

    // Generate prediction
    const lastStart = starts[starts.length - 1]
    const prediction = predictNextCycle(lastStart, avgCycleLength, cycleRecords.length)

    // Save prediction (delete old ones first)
    await prisma.prediction.deleteMany({ where: { userId } })
    await prisma.prediction.create({
      data: {
        userId,
        predictedPeriodDate: prediction.predictedPeriodDate,
        ovulationDate: prediction.ovulationDate,
        fertileWindowStart: prediction.fertileWindowStart,
        fertileWindowEnd: prediction.fertileWindowEnd,
        confidence: prediction.confidence,
        method: prediction.method,
      },
    })
  } catch (error) {
    console.error('Recalculate cycles error:', error)
  }
}
