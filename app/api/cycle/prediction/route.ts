import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { predictNextPeriod } from '@/lib/services/cycleService'
import { predictionQuerySchema } from '@/lib/validators/cycleTrackingValidator'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const validated = predictionQuerySchema.parse({
      referenceDate: searchParams.get('referenceDate') ?? undefined,
    })

    const prediction = await predictNextPeriod(authResult.user.userId, validated.referenceDate)

    return NextResponse.json({ success: true, data: prediction })
  } catch (error) {
    return createInternalErrorResponse(error, 'Cycle prediction error', 'Failed to generate cycle prediction')
  }
}
