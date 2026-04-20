import { NextRequest, NextResponse } from 'next/server'

const APP_LOCK_COOKIE = 'menomap_app_locked'

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

export async function GET(request: NextRequest) {
  const locked = request.cookies.get(APP_LOCK_COOKIE)?.value === '1'
  return NextResponse.json({ locked })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { locked?: boolean }
    const response = NextResponse.json({ locked: Boolean(body.locked) })

    if (body.locked) {
      response.cookies.set(APP_LOCK_COOKIE, '1', {
        ...cookieOptions(),
        maxAge: 60 * 60 * 24 * 365,
      })
    } else {
      response.cookies.set(APP_LOCK_COOKIE, '', {
        ...cookieOptions(),
        maxAge: 0,
      })
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Unable to update lock state' }, { status: 400 })
  }
}