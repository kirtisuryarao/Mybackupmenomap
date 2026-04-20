import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { logPeriodEnd } from '@/lib/services/cycleService'
import { periodEndSchema } from '@/lib/validators/cycleTrackingValidator'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const body = await request.json()
    const validated = periodEndSchema.parse(body)
    const cycle = await logPeriodEnd(authResult.user.userId, validated.date)

    return NextResponse.json({ success: true, data: cycle })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return createInternalErrorResponse(error, 'Cycle end error', 'Failed to log period end')
  }
}
