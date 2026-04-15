import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { recomputeCycleForUser } from '@/lib/cycle-recalculation'

const updateCycleSchema = z.object({
  lastPeriodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  cycleLength: z.number().int().min(20).max(40),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    // First check if user has CycleEntry (set at signup or manually by user)
    const cycleEntry = await prisma.cycleEntry.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      select: { lastPeriodDate: true, cycleLength: true },
    })

    // Try to get computed cycle from flow logs
    const computed = await recomputeCycleForUser(user.userId, { persist: false })

    // If we have flow logs, return computed data (more accurate)
    if (computed.hasCycleData) {
      return NextResponse.json({
        hasCycleData: true,
        lastPeriodDate: computed.lastPeriodDate,
        cycleLength: computed.cycleLength,
        cycleStarts: computed.cycleStarts,
        prediction: computed.prediction,
        ignoredFlowDates: computed.ignoredFlowDates,
        source: 'computed_from_logs',
      })
    }

    // Fallback to CycleEntry (user-provided initial data from signup)
    if (cycleEntry) {
      const lastPeriodDate = formatToIso(cycleEntry.lastPeriodDate)
      return NextResponse.json({
        hasCycleData: true,
        lastPeriodDate,
        cycleLength: cycleEntry.cycleLength,
        cycleStarts: [lastPeriodDate],
        prediction: null,
        source: 'user_provided',
      })
    }

    // No data at all
    return NextResponse.json({
      hasCycleData: false,
      lastPeriodDate: null,
      cycleLength: 28,
      cycleStarts: [],
      prediction: null,
      source: 'default',
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Get cycle error', 'Failed to get cycle data')
  }
}

function formatToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = updateCycleSchema.parse(body)

    const lastPeriodDate = new Date(`${validatedData.lastPeriodDate}T00:00:00`)

    await prisma.cycleEntry.create({
      data: {
        userId: user.userId,
        lastPeriodDate,
        cycleLength: validatedData.cycleLength,
      },
    })

    await prisma.user.update({
      where: { id: user.userId },
      data: { cycleLength: validatedData.cycleLength },
    })

    const computed = await recomputeCycleForUser(user.userId, { persist: true })

    return NextResponse.json(
      {
        hasCycleData: computed.hasCycleData,
        lastPeriodDate: computed.lastPeriodDate,
        cycleLength: computed.cycleLength,
        prediction: computed.prediction,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Update cycle error', 'Failed to update cycle data')
  }
}
