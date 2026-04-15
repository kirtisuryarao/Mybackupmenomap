import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateTokenPair } from '@/lib/auth'
import { createInternalErrorResponse } from '@/lib/api-error'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import {
  cleanupExpiredFileRefreshTokens,
  createFileRefreshToken,
  findFileUserByEmail,
} from '@/lib/file-auth-store'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Verify password
      const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash)

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Generate tokens
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
      })

      // Reset chat session on every successful login.
      await prisma.chatMessage.deleteMany({
        where: { userId: user.id },
      })

      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      // Clean up expired refresh tokens
      await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      })

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          cycleLength: user.cycleLength,
          periodDuration: user.periodDuration,
        },
        ...tokens,
      })
    } catch (error) {
      if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
        const user = await findFileUserByEmail(validatedData.email)

        if (!user) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        }

        const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash)

        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          )
        }

        const tokens = generateTokenPair({
          userId: user.id,
          email: user.email,
        })

        await createFileRefreshToken({
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        await cleanupExpiredFileRefreshTokens()

        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            cycleLength: user.cycleLength,
            periodDuration: user.periodDuration,
          },
          ...tokens,
        })
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

    return createInternalErrorResponse(error, 'Login error', 'Failed to login')
  }
}
