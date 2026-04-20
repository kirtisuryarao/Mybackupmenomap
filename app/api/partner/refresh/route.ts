import { NextRequest, NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { setPartnerAccessCookie, setPartnerRefreshCookie } from '@/lib/partner-auth-cookies'
import { refreshPartnerSession } from '@/lib/services/partner-auth-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const refreshToken = request.cookies.get('partner_refresh_token')?.value
      || (typeof body?.refreshToken === 'string' ? body.refreshToken : null)

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 401 })
    }

    const result = await refreshPartnerSession(refreshToken)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const response = NextResponse.json({ accessToken: result.data.accessToken })
    setPartnerAccessCookie(response, result.data.accessToken, result.data.accessTokenExpiresAt)
    setPartnerRefreshCookie(response, result.data.refreshToken, result.data.refreshTokenExpiresAt)
    return response
  } catch (error) {
    logger.error({ event: 'partner.refresh', status: 'failure' }, error)
    return NextResponse.json({ error: 'Failed to refresh partner session' }, { status: 500 })
  }
}
