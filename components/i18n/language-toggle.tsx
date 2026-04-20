'use client'

import { Languages } from 'lucide-react'

import { useI18n } from '@/components/i18n/language-provider'
import { Button } from '@/components/ui/button'

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Button
        type="button"
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLocale('en')}
      >
        {t('common.english')}
      </Button>
      <Button
        type="button"
        variant={locale === 'hi' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLocale('hi')}
      >
        {t('common.hindi')}
      </Button>
    </div>
  )
}
