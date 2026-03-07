import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTokenPair } from '@/lib/auth'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  lastPeriodDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  cycleLength: z.number().int().min(20).max(40),
  partnerPhone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signupSchema.parse({
      ...body,
      cycleLength: parseInt(body.cycleLength),
    })

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
          cycleLength: validatedData.cycleLength,
        },
      })

      // Create initial cycle entry
      await tx.cycleEntry.create({
        data: {
          userId: user.id,
          lastPeriodDate: new Date(validatedData.lastPeriodDate),
          cycleLength: validatedData.cycleLength,
        },
      })

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

      // Create partner if phone provided
      if (validatedData.partnerPhone) {
        await tx.partner.create({
          data: {
            userId: user.id,
            name: 'Partner', // Default name, can be updated later
            phone: validatedData.partnerPhone,
          },
        })
      }

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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    return NextResponse.json(
      {
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          cycleLength: result.cycleLength,
        },
        ...tokens,
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

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
