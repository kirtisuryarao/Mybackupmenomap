'use client'

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import {
  PrivacyPreferences,
  clearAppPin,
  getPrivacyPreferences,
  isAppLocked,
  lockApp,
  recordAppActivity,
  setAppPin,
  unlockApp,
  updatePrivacyPreferences,
  verifyPin,
} from '@/lib/security/privacyService'

interface PrivacyContextValue {
  preferences: PrivacyPreferences
  locked: boolean
  setPreferences: (patch: Partial<PrivacyPreferences>) => void
  savePin: (pin: string) => void
  disablePin: () => void
  unlockWithPin: (pin: string) => boolean
  lockNow: () => void
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<PrivacyPreferences>(getPrivacyPreferences())
  const [locked, setLocked] = useState(() => {
    const initialPreferences = getPrivacyPreferences()
    return initialPreferences.appLockEnabled && Boolean(initialPreferences.pinHash)
  })
  const lastActivityAtRef = useRef<number>(Date.now())

  useEffect(() => {
    setPreferencesState(getPrivacyPreferences())
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', preferences.largeText)
    document.documentElement.classList.toggle('high-contrast', preferences.highContrast)
  }, [preferences.largeText, preferences.highContrast])

  useEffect(() => {
    if (!preferences.appLockEnabled) {
      setLocked(false)
      return
    }

    let cancelled = false

    const syncLockState = async () => {
      try {
        const response = await fetch('/api/privacy/lock', {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { locked?: boolean }
        if (!cancelled && typeof data.locked === 'boolean') {
          setLocked(data.locked)
        }
      } catch {
        // Keep the conservative lock state until we can confirm otherwise.
      }
    }

    const onActivity = () => {
      if (isAppLocked()) {
        setLocked(true)
        return
      }

      recordAppActivity()
      lastActivityAtRef.current = Date.now()
    }

    void syncLockState()

    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'touchstart', 'mousemove', 'scroll']
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }

    const interval = window.setInterval(() => {
      if (!preferences.appLockEnabled || isAppLocked()) {
        return
      }

      const elapsedMs = Date.now() - lastActivityAtRef.current
      const timeoutMs = preferences.autoLockMinutes * 60_000
      if (elapsedMs >= timeoutMs) {
        lockApp()
        setLocked(true)
      }
    }, 15_000)

    return () => {
      cancelled = true
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, onActivity)
      }
      window.clearInterval(interval)
    }
  }, [preferences.appLockEnabled, preferences.autoLockMinutes])

  const setPreferences = (patch: Partial<PrivacyPreferences>) => {
    const next = updatePrivacyPreferences(patch)
    setPreferencesState(next)

    if (!next.appLockEnabled) {
      unlockApp()
      setLocked(false)
      return
    }

    if (next.appLockEnabled) {
      recordAppActivity()
    }
  }

  const savePin = (pin: string) => {
    const next = setAppPin(pin)
    setPreferencesState(next)
    recordAppActivity()
    lastActivityAtRef.current = Date.now()
    setLocked(false)
  }

  const disablePin = () => {
    const next = clearAppPin()
    setPreferencesState(next)
    setLocked(false)
  }

  const unlockWithPin = (pin: string) => {
    if (!verifyPin(pin)) {
      return false
    }

    unlockApp()
    recordAppActivity()
    lastActivityAtRef.current = Date.now()
    setLocked(false)
    return true
  }

  const lockNow = useCallback(() => {
    if (!preferences.appLockEnabled) return
    lockApp()
    setLocked(true)
  }, [preferences.appLockEnabled])

  const value = useMemo(
    () => ({
      preferences,
      locked,
      setPreferences,
      savePin,
      disablePin,
      unlockWithPin,
      lockNow,
    }),
    [preferences, locked, lockNow]
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (!context) {
    throw new Error('usePrivacy must be used within PrivacyProvider')
  }

  return context
}
