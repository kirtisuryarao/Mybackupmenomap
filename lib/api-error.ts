import { NextResponse } from 'next/server'

import { isAppSetupError } from '@/lib/setup-error'

export function createInternalErrorResponse(
  error: unknown,
  logLabel: string,
  fallbackMessage: string
) {
  console.error(`${logLabel}:`, error)

  if (isAppSetupError(error)) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Server configuration error',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
