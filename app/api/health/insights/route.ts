import { NextRequest, NextResponse } from 'next/server'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { getHealthInsights } from '@/lib/services/insightService'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const insights = await getHealthInsights(authResult.user.userId)

    return NextResponse.json({ success: true, data: insights })
  } catch (error) {
    return createInternalErrorResponse(error, 'Health insights error', 'Failed to load health insights')
  }
}
