'use client'

/**
 * Client-side authentication utilities
 * Handles token storage and API calls
 */

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface User {
  id: string
  email: string
  name: string
  cycleLength?: number
  periodDuration?: number
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

/**
 * Store tokens in localStorage
 */
export function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

/**
 * Get access token from localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Get both tokens
 */
export function getTokens(): AuthTokens | null {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  
  if (!accessToken || !refreshToken) return null
  
  return { accessToken, refreshToken }
}

/**
 * Clear tokens from localStorage
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): string | null {
  const token = getAccessToken()
  return token ? `Bearer ${token}` : null
}

/**
 * Sign up a new user
 */
export async function signup(data: {
  name: string
  email: string
  password: string
  lastPeriodDate: string
  cycleLength: number
  partnerPhone?: string
}): Promise<AuthResponse> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Signup failed')
  }

  const result: AuthResponse = await response.json()
  setTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  })
  return result
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Login failed')
  }

  const result: AuthResponse = await response.json()
  setTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  })
  return result
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    clearTokens()
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    clearTokens()
    const error = await response.json()
    throw new Error(error.error || 'Token refresh failed')
  }

  const tokens: AuthTokens = await response.json()
  setTokens(tokens)
  return tokens
}

/**
 * Get current user data
 */
export async function getCurrentUser(): Promise<User> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 401) {
    // Try to refresh token
    try {
      await refreshAccessToken()
      // Retry with new token
      const retryResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      })
      
      if (!retryResponse.ok) {
        clearTokens()
        throw new Error('Authentication failed')
      }
      
      return await retryResponse.json()
    } catch (error) {
      clearTokens()
      throw new Error('Authentication failed')
    }
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get user data')
  }

  return await response.json()
}

/**
 * Make authenticated API request with automatic token refresh
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  // If token expired, try to refresh
  if (response.status === 401) {
    try {
      await refreshAccessToken()
      // Retry with new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${getAccessToken()}`,
        },
      })
    } catch (error) {
      clearTokens()
      throw new Error('Authentication failed')
    }
  }

  return response
}
