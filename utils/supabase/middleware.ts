import { type NextRequest, NextResponse } from 'next/server'

/**
 * Update session for request (pass-through for now)
 * The application uses JWT authentication, not Supabase auth
 */
export async function updateSession(_request: NextRequest) {
  return NextResponse.next()
}
