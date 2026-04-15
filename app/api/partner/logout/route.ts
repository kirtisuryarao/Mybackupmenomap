import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPartnerTokenFromRequest, verifyPartnerRefreshToken } from '@/lib/partner-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const refreshTokenFromBody = typeof body?.refreshToken === 'string' ? body.refreshToken : null

    const refreshTokenHeader = request.headers.get('x-partner-refresh-token')
    const refreshToken = refreshTokenFromBody || refreshTokenHeader || null

    if (refreshToken) {
      const payload = verifyPartnerRefreshToken(refreshToken)
      if (payload?.partnerId) {
        await prisma.partnerRefreshToken.deleteMany({
          where: {
            partnerId: payload.partnerId,
            token: refreshToken,
          },
        })
      }
    }

    const accessToken = getPartnerTokenFromRequest(request)
    if (accessToken) {
      // Best effort cleanup of stale partner refresh tokens older than now.
      await prisma.partnerRefreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Partner logout error:', error)
    return NextResponse.json({ error: 'Failed to logout partner' }, { status: 500 })
  }
}
