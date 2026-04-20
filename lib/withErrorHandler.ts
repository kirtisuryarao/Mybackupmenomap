import { NextResponse } from 'next/server'

import { toFriendlyErrorMessage } from '@/lib/friendly-error'
import { logger } from '@/lib/logger'

import type { ApiResponse } from '@/lib/types/apiResponse'

export async function withErrorHandler<T>(
  action: () => Promise<NextResponse<ApiResponse<T>>>,
  onError?: (error: unknown) => NextResponse<ApiResponse<T>>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    return await action()
  } catch (error) {
    if (onError) return onError(error)

    logger.error({ event: 'api.unhandled_error', status: 'failure' }, error)
    return NextResponse.json(
      { success: false, error: toFriendlyErrorMessage(error, 'Something went wrong. Please try again.') },
      { status: 500 }
    )
  }
}
