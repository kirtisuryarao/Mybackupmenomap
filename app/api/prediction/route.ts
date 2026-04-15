import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/middleware'
import { createInternalErrorResponse } from '@/lib/api-error'
import { recomputeCycleForUser } from '@/lib/cycle-recalculation'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const { user } = authResult
    const computed = await recomputeCycleForUser(user.userId, { persist: false })

    if (!computed.prediction) {
      return NextResponse.json({
        predictedPeriodDate: null,
        ovulationDate: null,
        fertileWindowStart: null,
        fertileWindowEnd: null,
        confidence: 0,
        method: 'rule_based',
      })
    }

    return NextResponse.json(computed.prediction)
  } catch (error) {
    return createInternalErrorResponse(error, 'Prediction error', 'Failed to get prediction')
  }
}
