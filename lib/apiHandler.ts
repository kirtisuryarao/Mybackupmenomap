import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'

export async function apiHandler<T>(
  action: () => Promise<NextResponse<T> | NextResponse>,
  onError?: (error: unknown) => NextResponse<T> | NextResponse
): Promise<NextResponse<T> | NextResponse> {
  try {
    return await action()
  } catch (error) {
    if (onError) {
      return onError(error)
    }
    logger.error({ event: 'api.unhandled_error', status: 'failure' }, error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
