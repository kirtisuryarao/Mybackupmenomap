import { NextRequest, NextResponse } from 'next/server'

import { clearPartnerAuthCookies } from '@/lib/partner-auth-cookies'
import { verifyPartnerRefreshToken } from '@/lib/partner-auth'
import { logoutPartner } from '@/lib/services/partner-auth-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const refreshTokenFromBody = typeof body?.refreshToken === 'string' ? body.refreshToken : null

    const refreshTokenHeader = request.headers.get('x-partner-refresh-token')
    const refreshToken = refreshTokenFromBody || refreshTokenHeader || null

    if (refreshToken) {
      const payload = verifyPartnerRefreshToken(refreshToken)
      if (payload?.partnerId) {
        await logoutPartner(payload.partnerId, refreshToken)
      }
    }

    const response = NextResponse.json({ success: true })
    clearPartnerAuthCookies(response)
    return response
  } catch (error) {
    console.error('Partner logout error:', error)
    return NextResponse.json({ error: 'Failed to logout partner' }, { status: 500 })
  }
}
