import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { recomputeCycleForUser } from '@/lib/cycle-recalculation'
import { getCycleData } from '@/lib/get-cycle-data'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

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
    console.error(`[Cycle API GET] User ${user.userId}: Fetching cycle data`)

    // Use shared utility - SINGLE SOURCE OF TRUTH for cycle data
    try {
      const cycleData = await getCycleData(user.userId)
      console.error(`[Cycle API GET] User ${user.userId}: Successfully fetched cycle data`, {
        hasCycleData: cycleData.hasCycleData,
        source: cycleData.source,
      })
      return NextResponse.json(cycleData)
    } catch (getCycleError) {
      console.error(`[Cycle API GET] Error in getCycleData for user ${user.userId}:`, getCycleError)
      throw getCycleError
    }
  } catch (error) {
    console.error(`[Cycle API GET] Unhandled error:`, error)
    return createInternalErrorResponse(error, 'Get cycle error', 'Failed to get cycle data')
  }
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

    console.error(`[Cycle API] User ${user.userId}: Creating/updating cycle entry`, {
      lastPeriodDate: validatedData.lastPeriodDate,
      cycleLength: validatedData.cycleLength,
    })

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

    await recomputeCycleForUser(user.userId, { persist: true })

    const cycleData = await getCycleData(user.userId)

    console.error(`[Cycle API] User ${user.userId}: Cycle entry saved and returned cycle data`, {
      hasCycleData: cycleData.hasCycleData,
      lastPeriodDate: cycleData.lastPeriodDate,
      cycleLength: cycleData.cycleLength,
      source: cycleData.source,
    })

    return NextResponse.json(cycleData, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Cycle API] Validation error:`, error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Update cycle error', 'Failed to update cycle data')
  }
}
