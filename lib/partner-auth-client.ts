'use client'

export function clearPartnerSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('partnerAccessToken')
  localStorage.removeItem('partnerRefreshToken')
  localStorage.removeItem('partnerId')
  localStorage.removeItem('partnerData')
}

export async function refreshPartnerAccessToken(): Promise<string> {
  const response = await fetch('/api/partner/refresh', {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    clearPartnerSession()
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Partner session refresh failed')
  }

  const payload = await response.json() as { accessToken: string }
  return payload.accessToken
}

export async function partnerAuthenticatedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
  })

  if (response.status !== 401) {
    return response
  }

  await refreshPartnerAccessToken()
  return fetch(input, {
    ...init,
    credentials: 'include',
  })
}
