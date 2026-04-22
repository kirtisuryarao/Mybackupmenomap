import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { verifyRefreshToken, generateTokenPair } from '@/lib/auth'
import { hashRefreshToken } from '@/lib/auth/jwt'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import {
  createFileRefreshToken,
  deleteFileRefreshTokenById,
  findFileRefreshToken,
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


const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const refreshTokenFromCookie = request.cookies.get('refresh_token')?.value
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : refreshTokenFromCookie
    
    // Validate input
    const validatedData = refreshSchema.parse({ refreshToken })
    const tokenHash = hashRefreshToken(validatedData.refreshToken)

    // Verify refresh token
    try {
      verifyRefreshToken(validatedData.refreshToken)
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    try {
      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      })

      if (!storedToken || storedToken.expiresAt < new Date()) {
        // Clean up expired token
        if (storedToken) {
          await prisma.refreshToken.deleteMany({
            where: { id: storedToken.id },
          })
        }
        return NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 }
        )
      }

      // Verify user still exists
      if (!storedToken.user) {
        await prisma.refreshToken.deleteMany({
          where: { id: storedToken.id },
        })
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        )
      }

      // Generate new token pair
      const tokens = generateTokenPair({
        userId: storedToken.user.id,
        email: storedToken.user.email,
      })

      // Delete old refresh token (use deleteMany to avoid P2025 race condition)
      await prisma.refreshToken.deleteMany({
        where: { id: storedToken.id },
      })

      // Store new refresh token
      await prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: hashRefreshToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      const response = NextResponse.json(tokens)
      attachAuthCookies(response, tokens.accessToken, tokens.refreshToken)
      return response
    } catch (error) {
      if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
        const storedToken = await findFileRefreshToken(validatedData.refreshToken)

        if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
          if (storedToken) {
            await deleteFileRefreshTokenById(storedToken.id)
          }

          return NextResponse.json(
            { error: 'Invalid or expired refresh token' },
            { status: 401 }
          )
        }

        if (!storedToken.user) {
          await deleteFileRefreshTokenById(storedToken.id)
          return NextResponse.json(
            { error: 'User not found' },
            { status: 401 }
          )
        }

        const tokens = generateTokenPair({
          userId: storedToken.user.id,
          email: storedToken.user.email,
        })

        await deleteFileRefreshTokenById(storedToken.id)
        await createFileRefreshToken({
          userId: storedToken.user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })

        const response = NextResponse.json(tokens)
        attachAuthCookies(response, tokens.accessToken, tokens.refreshToken)
        return response
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

    return createInternalErrorResponse(error, 'Refresh token error', 'Failed to refresh token')
  }
}
