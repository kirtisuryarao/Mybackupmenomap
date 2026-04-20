'use client'

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { AppLocale, translations } from '@/lib/i18n/translations'

interface LanguageContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: string) => string
}

const LANGUAGE_STORAGE_KEY = 'menomap:locale'

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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en')

  useEffect(() => {
    // 1. Check localStorage first
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved === 'en' || saved === 'hi') {
      setLocaleState(saved)
      document.documentElement.lang = saved
      return
    }

    // 2. Try browser language if nothing saved
    const browserLang = navigator.language?.split('-')[0].toLowerCase() || 'en'
    const detectedLocale = browserLang === 'hi' ? 'hi' : 'en'
    setLocaleState(detectedLocale)
    document.documentElement.lang = detectedLocale
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, detectedLocale)
  }, [])

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale)
    document.documentElement.lang = nextLocale
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
