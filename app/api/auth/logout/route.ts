import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { getTokenFromRequest } from '@/lib/middleware'

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

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
