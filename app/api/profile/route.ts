import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'


const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  age: z.number().int().min(1).max(120).optional().nullable(),
  cycleLength: z.number().int().min(20).max(40).optional(),
  periodLength: z.number().int().min(1).max(15).optional(),
  periodDuration: z.number().int().min(1).max(10).optional(),
  menopauseStage: z.enum(['regular', 'irregular', 'perimenopause', 'menopause']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        cycleLength: true,
        periodDuration: true,
        menopauseStage: true,
        partners: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    })

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...userData,
      periodLength: userData.periodDuration,
    })
  } catch (error) {
    return createInternalErrorResponse(error, 'Get profile error', 'Failed to get profile')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult
    const body = await request.json()
    
    const validatedData = updateProfileSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.email && { email: validatedData.email }),
        ...(validatedData.age !== undefined && { age: validatedData.age }),
        ...(validatedData.cycleLength && { cycleLength: validatedData.cycleLength }),
        ...(validatedData.periodLength && {
          periodDuration: validatedData.periodLength,
        }),
        ...(validatedData.periodDuration && { periodDuration: validatedData.periodDuration }),
        ...(validatedData.menopauseStage && { menopauseStage: validatedData.menopauseStage }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        cycleLength: true,
        periodDuration: true,
        menopauseStage: true,
      },
    })

    return NextResponse.json({
      ...updatedUser,
      periodLength: updatedUser.periodDuration,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Update profile error', 'Failed to update profile')
  }
}
