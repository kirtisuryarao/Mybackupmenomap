import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

import type { SignOptions } from 'jsonwebtoken'

export interface PartnerJWTPayload {
  partnerId: string
  email: string
  type: 'partner'
  iat?: number
  exp?: number
}

export interface PartnerRefreshPayload {
  partnerId: string
  type: 'partner_refresh'
  iat?: number
  exp?: number
}

export interface PartnerTokenPair {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

const PARTNER_JWT_SECRET =
  process.env.PARTNER_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key'
const PARTNER_JWT_REFRESH_SECRET =
  process.env.PARTNER_JWT_REFRESH_SECRET ||
  process.env.JWT_REFRESH_SECRET ||
  'your-refresh-secret-key'
const PARTNER_JWT_EXPIRES_IN = (process.env.PARTNER_JWT_EXPIRES_IN || '1h') as SignOptions['expiresIn']
const PARTNER_JWT_REFRESH_EXPIRES_IN = (process.env.PARTNER_JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn']

export function generatePartnerAccessToken(partnerId: string, email: string) {
  return jwt.sign(
    {
      partnerId,
      email,
      type: 'partner',
    },
    PARTNER_JWT_SECRET,
    { expiresIn: PARTNER_JWT_EXPIRES_IN }
  )
}

export function generatePartnerRefreshToken(partnerId: string) {
  return jwt.sign(
    {
      partnerId,
      type: 'partner_refresh',
    },
    PARTNER_JWT_REFRESH_SECRET,
    { expiresIn: PARTNER_JWT_REFRESH_EXPIRES_IN }
  )
}

export function generatePartnerTokenPair(partnerId: string, email: string) {
  const accessToken = generatePartnerAccessToken(partnerId, email)
  const refreshToken = generatePartnerRefreshToken(partnerId)
  const accessPayload = jwt.decode(accessToken) as { exp?: number } | null
  const refreshPayload = jwt.decode(refreshToken) as { exp?: number } | null

  const defaultAccessExpiry = new Date(Date.now() + 60 * 60 * 1000)
  const defaultRefreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: accessPayload?.exp ? new Date(accessPayload.exp * 1000) : defaultAccessExpiry,
    refreshTokenExpiresAt: refreshPayload?.exp ? new Date(refreshPayload.exp * 1000) : defaultRefreshExpiry,
  }
}

export function verifyPartnerToken(token: string): PartnerJWTPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      PARTNER_JWT_SECRET
    ) as PartnerJWTPayload

    if (decoded.type !== 'partner') {
      return null
    }

    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function verifyPartnerRefreshToken(token: string): PartnerRefreshPayload | null {
  try {
    const decoded = jwt.verify(token, PARTNER_JWT_REFRESH_SECRET) as PartnerRefreshPayload
    if (decoded.type !== 'partner_refresh') {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

export function getPartnerTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

export function extractPartnerIdFromRequest(request: NextRequest): string | null {
  const token = getPartnerTokenFromRequest(request)
  if (!token) return null

  const payload = verifyPartnerToken(token)
  return payload?.partnerId || null
}

export function createPartnerAuthResponse(error: string, status: number = 401) {
  return NextResponse.json({ error }, { status })
}

export async function validatePartnerRequest(request: NextRequest): Promise<{
  partnerId: string | null
  error: string | null
}> {
  const token = getPartnerTokenFromRequest(request)
  
  if (!token) {
    return {
      partnerId: null,
      error: 'Authorization token required',
    }
  }

  const payload = verifyPartnerToken(token)
  
  if (!payload) {
    return {
      partnerId: null,
      error: 'Invalid or expired token',
    }
  }

  return {
    partnerId: payload.partnerId,
    error: null,
  }
}
