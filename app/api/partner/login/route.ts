import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/lib/logger'
import { setPartnerAccessCookie, setPartnerRefreshCookie } from '@/lib/partner-auth-cookies'
import { loginPartner } from '@/lib/services/partner-auth-service'

const partnerLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = partnerLoginSchema.parse(body)

    const result = await loginPartner(validatedData.email, validatedData.password)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const response = NextResponse.json({
      partner: result.data.partner,
      accessToken: result.data.tokens.accessToken,
      refreshToken: result.data.tokens.refreshToken,
    })
    setPartnerAccessCookie(response, result.data.tokens.accessToken, result.data.tokens.accessTokenExpiresAt)
    setPartnerRefreshCookie(response, result.data.tokens.refreshToken, result.data.tokens.refreshTokenExpiresAt)
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }

    logger.error({ event: 'partner.login', status: 'failure' }, error)
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 })
  }
}
