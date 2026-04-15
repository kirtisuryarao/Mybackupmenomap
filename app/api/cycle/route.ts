import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { z } from 'zod'

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

    // Get the most recent cycle entry
    const cycleEntry = await prisma.cycleEntry.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!cycleEntry) {
      // Return user's default cycle length
      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { cycleLength: true },
      })

      return NextResponse.json({
        lastPeriodDate: new Date().toISOString().split('T')[0],
        cycleLength: userData?.cycleLength || 28,
      })
    }

    return NextResponse.json({
      lastPeriodDate: cycleEntry.lastPeriodDate.toISOString().split('T')[0],
      cycleLength: cycleEntry.cycleLength,
    })
  } catch (error) {
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

    // Create new cycle entry
    const cycleEntry = await prisma.cycleEntry.create({
      data: {
        userId: user.userId,
        lastPeriodDate: new Date(validatedData.lastPeriodDate),
        cycleLength: validatedData.cycleLength,
      },
    })

    // Also update user's default cycle length
    await prisma.user.update({
      where: { id: user.userId },
      data: { cycleLength: validatedData.cycleLength },
    })

    return NextResponse.json({
      lastPeriodDate: cycleEntry.lastPeriodDate.toISOString().split('T')[0],
      cycleLength: cycleEntry.cycleLength,
    }, { status: 201 })
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
