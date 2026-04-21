'use client'

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { AppLocale, translations } from '@/lib/i18n/translations'

interface LanguageContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: string) => string
}

const LANGUAGE_STORAGE_KEY = 'menomap:locale'
const LANGUAGE_COOKIE_KEY = 'menomap_locale'

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readPathValue(source: Record<string, unknown>, key: string): string | null {
  let current: unknown = source

  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object') {
      return null
    }

    current = (current as Record<string, unknown>)[part]
  }

  return typeof current === 'string' ? current : null
}

function isLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'hi'
}

function readCookieLocale(): AppLocale | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LANGUAGE_COOKIE_KEY}=`))

  const value = cookie?.split('=')[1]
  return isLocale(value) ? value : null
}

function resolveInitialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const storedLocale = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (isLocale(storedLocale)) {
    return storedLocale
  }

  const cookieLocale = readCookieLocale()
  if (cookieLocale) {
    return cookieLocale
  }

  const browserLang = navigator.language?.split('-')[0].toLowerCase() || 'en'
  return browserLang === 'hi' ? 'hi' : 'en'
}

function persistLocale(locale: AppLocale) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
  document.documentElement.lang = locale
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(resolveInitialLocale)

  useEffect(() => {
    persistLocale(locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback((key: string): string => {
    const selected = readPathValue(translations[locale] as unknown as Record<string, unknown>, key)
    if (selected) return selected

    const fallback = readPathValue(translations.en as unknown as Record<string, unknown>, key)
    return fallback ?? key
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider')
  }

  return context
}

export const useLanguage = useI18n
