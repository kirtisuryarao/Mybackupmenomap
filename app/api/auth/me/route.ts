import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { canUseFileAuthFallback, isPrismaConnectionError } from '@/lib/db-fallback'
import { findFileUserById, toApiUser } from '@/lib/file-auth-store'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) {
      return authResult.error
    }

    const { user } = authResult

    try {
      // Get user with related data
      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          age: true,
          cycleLength: true,
          periodDuration: true,
          createdAt: true,
          partners: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          notificationSettings: true,
          privacySettings: true,
        },
      })

      if (!userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(userData)
    } catch (error) {
      if (isPrismaConnectionError(error) && canUseFileAuthFallback()) {
        const localUser = await findFileUserById(user.userId)

        if (!localUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        return NextResponse.json(toApiUser(localUser))
      }

      throw error
    }
  } catch (error) {
    return createInternalErrorResponse(error, 'Get user error', 'Failed to get user data')
  }
}
