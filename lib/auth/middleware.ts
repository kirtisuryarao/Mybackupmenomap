import { NextRequest, NextResponse } from 'next/server'

import { verifyAccessToken, type AccessTokenPayload } from '@/lib/auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: AccessTokenPayload
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return request.cookies.get('access_token')?.value ?? null
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: AccessTokenPayload } | { error: NextResponse }> {
  const token = getTokenFromRequest(request)

  if (!token) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  try {
    return { user: verifyAccessToken(token) }
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    }
  }
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AccessTokenPayload | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null

  try {
    return verifyAccessToken(token)
  } catch {
    return null
  }
}
