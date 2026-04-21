import { useState, useCallback, useEffect } from 'react'

interface PartnerData {
  id: string
  name: string
  linkedUser: {
    id: string
    name: string
    email: string
  }
}

export function usePartnerAuth() {
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null)
  const [isPartnerLoggedIn, setIsPartnerLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if partner is logged in on mount
    const storedPartnerId = localStorage.getItem('partnerId')
    const storedAccessToken = localStorage.getItem('partnerAccessToken')
    const storedPartnerData = localStorage.getItem('partnerData')

    if (storedPartnerId && storedAccessToken) {
      setPartnerId(storedPartnerId)
      setIsPartnerLoggedIn(true)
      if (storedPartnerData) {
        try {
          setPartnerData(JSON.parse(storedPartnerData))
        } catch (_e) {
          console.error('Failed to parse partner data')
        }
      }
    }
    setIsLoading(false)
  }, [])

  const getPartnerAccessToken = useCallback(() => {
    return localStorage.getItem('partnerAccessToken')
  }, [])

  const getPartnerRefreshToken = useCallback(() => {
    return localStorage.getItem('partnerRefreshToken')
  }, [])

  const logoutPartner = useCallback(() => {
    localStorage.removeItem('partnerId')
    localStorage.removeItem('partnerAccessToken')
    localStorage.removeItem('partnerRefreshToken')
    localStorage.removeItem('partnerData')
    setPartnerId(null)
    setPartnerData(null)
    setIsPartnerLoggedIn(false)
  }, [])

  const loginPartner = useCallback(
    (id: string, data: PartnerData, accessToken: string, refreshToken: string) => {
      localStorage.setItem('partnerId', id)
      localStorage.setItem('partnerData', JSON.stringify(data))
      localStorage.setItem('partnerAccessToken', accessToken)
      localStorage.setItem('partnerRefreshToken', refreshToken)
      setPartnerId(id)
      setPartnerData(data)
      setIsPartnerLoggedIn(true)
    },
    []
  )

  return {
    partnerId,
    partnerData,
    isPartnerLoggedIn,
    isLoading,
    getPartnerAccessToken,
    getPartnerRefreshToken,
    logoutPartner,
    loginPartner,
  }
}

export function usePartnerSession() {
  const [isPartnerMode, setIsPartnerMode] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('partnerAccessToken')
    setIsPartnerMode(!!token)
  }, [])

  const switchToPartnerMode = useCallback(() => {
    const token = localStorage.getItem('partnerAccessToken')
    if (token) {
      setIsPartnerMode(true)
    }
  }, [])

  const switchToUserMode = useCallback(() => {
    setIsPartnerMode(false)
  }, [])

  return {
    isPartnerMode,
    switchToPartnerMode,
    switchToUserMode,
  }
}
