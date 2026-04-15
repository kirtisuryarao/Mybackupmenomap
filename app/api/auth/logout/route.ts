import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { getTokenFromRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import { deleteFileRefreshTokensByUser } from '@/lib/file-auth-store'

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
        await prisma.refreshToken.deleteMany({
          where: {
            userId: user.userId,
            token: refreshToken,
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

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    return createInternalErrorResponse(error, 'Logout error', 'Failed to logout')
  }
}
