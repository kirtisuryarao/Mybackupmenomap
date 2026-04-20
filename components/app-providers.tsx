'use client'

import { ReactNode } from 'react'

import { LanguageProvider } from '@/components/i18n/language-provider'
import { PrivacyProvider } from '@/components/privacy/privacy-provider'
import { ThemeProvider } from '@/components/theme-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <PrivacyProvider>{children}</PrivacyProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
