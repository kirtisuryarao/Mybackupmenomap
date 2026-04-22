'use client'

export function clearPartnerSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('partnerAccessToken')
  localStorage.removeItem('partnerRefreshToken')
  localStorage.removeItem('partnerId')
  localStorage.removeItem('partnerData')
}

export async function refreshPartnerAccessToken(): Promise<string> {
  const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('partnerRefreshToken') : null
  const response = await fetch('/api/partner/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(storedRefreshToken ? { refreshToken: storedRefreshToken } : {}),
    credentials: 'include',
  })

  if (!response.ok) {
    clearPartnerSession()
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Partner session refresh failed')
  }

  const payload = await response.json() as { accessToken: string; refreshToken?: string }
  if (typeof window !== 'undefined') {
    localStorage.setItem('partnerAccessToken', payload.accessToken)
    if (payload.refreshToken) {
      localStorage.setItem('partnerRefreshToken', payload.refreshToken)
    }
  }
  return payload.accessToken
}

export async function partnerAuthenticatedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('partnerAccessToken') : null
  const baseHeaders = new Headers(init.headers ?? undefined)
  if (accessToken && !baseHeaders.has('Authorization')) {
    baseHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(input, {
    ...init,
    headers: baseHeaders,
    credentials: 'include',
  })

  if (response.status !== 401) {
    return response
  }

  const nextAccessToken = await refreshPartnerAccessToken()
  const retryHeaders = new Headers(init.headers ?? undefined)
  if (!retryHeaders.has('Authorization')) {
    retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`)
  }

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: 'include',
  })
}
