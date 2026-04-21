import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { hashPassword, generateTokenPair } from '@/lib/auth'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import {
  createFileRefreshToken,
  createFileUser,
  findFileUserByEmail,
} from '@/lib/file-auth-store'
import { prisma } from '@/lib/prisma'


const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  age: z.number().int().min(1).max(120),
  lastPeriodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  cycleLength: z.number().int().min(20).max(40),
  periodLength: z.number().int().min(1).max(15),
  menopauseStage: z.enum(['regular', 'irregular', 'perimenopause', 'menopause']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signupSchema.parse({
      ...body,
      age: parseInt(body.age),
      cycleLength: parseInt(body.cycleLength),
      periodLength: parseInt(body.periodLength),
    })

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password)

      // Create user and related data in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: validatedData.email,
            passwordHash,
            name: validatedData.name,
            age: validatedData.age,
            cycleLength: validatedData.cycleLength,
            periodDuration: validatedData.periodLength,
            menopauseStage: validatedData.menopauseStage,
          },
        })

        if (validatedData.lastPeriodDate) {
          await tx.cycleEntry.create({
            data: {
              userId: user.id,
              lastPeriodDate: new Date(validatedData.lastPeriodDate),
              cycleLength: validatedData.cycleLength,
            },
          })
        }

        // Create default notification settings
        await tx.notificationSettings.create({
          data: {
            userId: user.id,
          },
        })

        // Create default privacy settings
        await tx.privacySettings.create({
          data: {
            userId: user.id,
          },
        })

        return user
      })

      // Generate tokens
      const tokens = generateTokenPair({
        userId: result.id,
        email: result.email,
      })

      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          userId: result.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.json(
        {
          user: {
            id: result.id,
            email: result.email,
            name: result.name,
            age: result.age,
            cycleLength: result.cycleLength,
            periodLength: result.periodLength,
            menopauseStage: result.menopauseStage,
          },
          ...tokens,
        },
        { status: 201 }
      )
    } catch (error) {
      if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
        const existingUser = await findFileUserByEmail(validatedData.email)

        if (existingUser) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 400 }
          )
        }

        const passwordHash = await hashPassword(validatedData.password)
        const result = await createFileUser({
          email: validatedData.email,
          passwordHash,
          name: validatedData.name,
          age: validatedData.age,
          cycleLength: validatedData.cycleLength,
          periodLength: validatedData.periodLength,
          menopauseStage: validatedData.menopauseStage,
          lastPeriodDate: validatedData.lastPeriodDate,
        })

        const tokens = generateTokenPair({
          userId: result.id,
          email: result.email,
        })

        await createFileRefreshToken({
          userId: result.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })

        return NextResponse.json(
          {
            user: {
              id: result.id,
              email: result.email,
              name: result.name,
              age: result.age,
              cycleLength: result.cycleLength,
              periodLength: result.periodLength,
              menopauseStage: result.menopauseStage,
            },
            ...tokens,
          },
          { status: 201 }
        )
      }

      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Signup error', 'Failed to create account')
  }
}
