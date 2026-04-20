import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { buildHybridPredictionForUser } from '@/lib/hybrid-prediction'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult

    const prediction = await buildHybridPredictionForUser(user.userId, {
      includeExplanation: true,
      persist: true,
    })

    return NextResponse.json(prediction)
  } catch (error) {
    return createInternalErrorResponse(error, 'Predict error', 'Failed to generate prediction')
  }
}
