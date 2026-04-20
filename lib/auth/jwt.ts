import { createHash, randomUUID } from 'crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-access-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'replace-this-refresh-secret'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn']
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn']

export interface TokenUser {
  userId: string
  email: string
}

export interface AccessTokenPayload extends TokenUser {
  type: 'access'
  sessionId: string
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload extends TokenUser {
  type: 'refresh'
  sessionId: string
  jti: string
  iat?: number
  exp?: number
}

export interface IssuedTokenPair {
  accessToken: string
  refreshToken: string
  sessionId: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}

function getTokenExpiryDate(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null
  if (!decoded?.exp) {
    throw new Error('Token expiration missing')
  }

  return new Date(decoded.exp * 1000)
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function signAccessToken(user: TokenUser, sessionId = randomUUID()): string {
  return jwt.sign(
    { userId: user.userId, email: user.email, type: 'access', sessionId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload
  if (payload.type !== 'access') {
    throw new Error('Invalid access token')
  }

  return payload
}

export function signRefreshToken(user: TokenUser, sessionId = randomUUID()): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      type: 'refresh',
      sessionId,
      jti: randomUUID(),
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  )
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token')
  }

  return payload
}

export function issueTokenPair(user: TokenUser): IssuedTokenPair {
  const sessionId = randomUUID()
  const accessToken = signAccessToken(user, sessionId)
  const refreshToken = signRefreshToken(user, sessionId)

  return {
    accessToken,
    refreshToken,
    sessionId,
    accessTokenExpiresAt: getTokenExpiryDate(accessToken),
    refreshTokenExpiresAt: getTokenExpiryDate(refreshToken),
  }
}
