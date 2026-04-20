import { NextResponse } from 'next/server'

const isProduction = process.env.NODE_ENV === 'production'

export function setPartnerAccessCookie(response: NextResponse, accessToken: string, expiresAt: Date) {
  response.cookies.set('partner_access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  })
}

export function setPartnerRefreshCookie(response: NextResponse, refreshToken: string, expiresAt: Date) {
  response.cookies.set('partner_refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/partner',
    expires: expiresAt,
  })
}

export function clearPartnerAccessCookie(response: NextResponse) {
  response.cookies.set('partner_access_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  })
}

export function clearPartnerRefreshCookie(response: NextResponse) {
  response.cookies.set('partner_refresh_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/partner',
    expires: new Date(0),
  })
}

export function clearPartnerAuthCookies(response: NextResponse) {
  clearPartnerAccessCookie(response)
  clearPartnerRefreshCookie(response)
}
