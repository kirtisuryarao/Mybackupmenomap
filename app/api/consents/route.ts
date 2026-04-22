import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { grantConsent, listUserConsents, revokeConsent } from '@/lib/services/consent-service'

const consentScopeSchema = z.enum(['cycle', 'symptoms', 'mood', 'notes'])

const grantConsentSchema = z.object({
  partnerId: z.string().min(1, 'Partner id is required'),
  scopes: z.array(consentScopeSchema).min(1, 'At least one scope is required'),
  expiresAt: z.string().datetime().optional(),
})

const revokeConsentSchema = z.object({
  partnerId: z.string().min(1, 'Partner id is required'),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const result = await listUserConsents(authResult.user.userId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return createInternalErrorResponse(error, 'Consent list error', 'Failed to load consent settings')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const body = await request.json()
    const validated = grantConsentSchema.parse(body)
    const expiresAt = validated.expiresAt
      ? new Date(validated.expiresAt)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    const result = await grantConsent({
      userId: authResult.user.userId,
      partnerId: validated.partnerId,
      scopes: validated.scopes,
      expiresAt,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }

    return createInternalErrorResponse(error, 'Consent grant error', 'Failed to save consent settings')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const body = await request.json().catch(() => ({}))
    const validated = revokeConsentSchema.parse(body)

    const result = await revokeConsent(authResult.user.userId, validated.partnerId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }

    return createInternalErrorResponse(error, 'Consent revoke error', 'Failed to revoke consent')
  }
}
