import { NextResponse } from 'next/server'

import type { IssuedTokenPair } from '@/lib/auth/jwt'

const isProduction = process.env.NODE_ENV === 'production'

export function setAuthCookies(response: NextResponse, tokens: IssuedTokenPair) {
  response.cookies.set('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    expires: tokens.accessTokenExpiresAt,
  })

  response.cookies.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    expires: tokens.refreshTokenExpiresAt,
  })
}

export function clearAuthCookies(response: NextResponse) {
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
