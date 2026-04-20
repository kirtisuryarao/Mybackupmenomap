import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createInternalErrorResponse } from '@/lib/api-error'
import { authenticateRequest } from '@/lib/middleware'
import { logFertilityData } from '@/lib/services/fertilityService'
import { fertilityLogSchema } from '@/lib/validators/fertilityValidator'

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if ('error' in authResult) return authResult.error

    const body = await request.json()
    const validated = fertilityLogSchema.parse(body)

    const saved = await logFertilityData(authResult.user.userId, validated)

    return NextResponse.json({ success: true, data: saved }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return createInternalErrorResponse(error, 'Fertility log error', 'Failed to log fertility data')
  }
}
