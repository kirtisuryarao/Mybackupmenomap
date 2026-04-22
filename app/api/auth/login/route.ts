import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { verifyPassword, generateTokenPair } from '@/lib/auth'
import { hashRefreshToken } from '@/lib/auth/jwt'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import {
  cleanupExpiredFileRefreshTokens,
  createFileRefreshToken,
  findFileUserByEmail,
} from '@/lib/file-auth-store'
import { prisma } from '@/lib/prisma'

const isProduction = process.env.NODE_ENV === 'production'

function attachAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60,
  })

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  })
}


const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

async function authenticateWithFileStore(email: string, password: string) {
  const user = await findFileUserByEmail(email)

  if (!user) {
    return null
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash)
  if (!isValidPassword) {
    return null
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

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      cycleLength: user.cycleLength,
      periodDuration: user.periodDuration,
    },
    ...tokens,
  })

  attachAuthCookies(response, tokens.accessToken, tokens.refreshToken)
  return response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse({
      email: typeof body?.email === 'string' ? body.email.trim().toLowerCase() : body?.email,
      password: typeof body?.password === 'string' ? body.password : body?.password,
    })

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })

      if (!user && canUseFileAuthFallback()) {
        const fallbackResponse = await authenticateWithFileStore(validatedData.email, validatedData.password)
        if (fallbackResponse) {
          return fallbackResponse
        }
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Verify password
      const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash)

      if (!isValidPassword && canUseFileAuthFallback()) {
        const fallbackResponse = await authenticateWithFileStore(validatedData.email, validatedData.password)
        if (fallbackResponse) {
          return fallbackResponse
        }
      }

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

      // Store refresh token in database
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      // Clean up expired refresh tokens
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
        },
      })

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          cycleLength: user.cycleLength,
          periodDuration: user.periodDuration,
        },
        ...tokens,
      })

      attachAuthCookies(response, tokens.accessToken, tokens.refreshToken)
      return response
    } catch (error) {
      if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
        const fallbackResponse = await authenticateWithFileStore(validatedData.email, validatedData.password)
        if (fallbackResponse) {
          return fallbackResponse
        }

        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
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

    return createInternalErrorResponse(error, 'Login error', 'Failed to login')
  }
}
