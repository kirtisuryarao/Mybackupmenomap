import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { getFertilityInsights } from '@/lib/services/fertilityService'
import { insightsQuerySchema } from '@/lib/validators/fertilityValidator'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { searchParams } = new URL(request.url)
    const validated = insightsQuerySchema.parse({
      referenceDate: searchParams.get('referenceDate') ?? undefined,
    })

    const insights = await getFertilityInsights(authResult.user.userId, validated.referenceDate)

    return NextResponse.json({ success: true, data: insights })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Fertility insights error', 'Failed to load fertility insights')
  }
}
