import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { hashRefreshToken } from '@/lib/auth/jwt'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import { deleteFileRefreshTokensByUser } from '@/lib/file-auth-store'
import { getTokenFromRequest , authenticateRequest } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

const isProduction = process.env.NODE_ENV === 'production'

function clearAuthCookies(response: NextResponse) {
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  })

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    expires: new Date(0),
  })
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    // Get refresh token from request body
    const body = await request.json().catch(() => ({}))
    const refreshToken = body.refreshToken || getTokenFromRequest(request)

    try {
      // Delete refresh token if provided
      if (refreshToken) {
        const tokenHash = hashRefreshToken(refreshToken)
        await prisma.refreshToken.deleteMany({
          where: {
            userId: user.userId,
            tokenHash,
          },
        })
      } else {
        // Delete all refresh tokens for user
        await prisma.refreshToken.deleteMany({
          where: {
            userId: user.userId,
          },
        })
      }
    } catch (error) {
      if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
        await deleteFileRefreshTokensByUser(user.userId, refreshToken)
      } else {
        throw error
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' })
    clearAuthCookies(response)
    return response
  } catch (error) {
    return createInternalErrorResponse(error, 'Logout error', 'Failed to logout')
  }
}
