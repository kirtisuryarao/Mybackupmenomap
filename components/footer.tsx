'use client'

import Link from 'next/link'

import { useI18n } from '@/components/i18n/language-provider'

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('footer.about')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('footer.aboutText')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('footer.quickLinks')}</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/home" className="hover:text-primary">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('footer.support')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('footer.supportPrompt')} <br />
              <a href="mailto:support@cyclecompanion.com" className="hover:text-primary">
                support@cyclecompanion.com
              </a>
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 MenoMap. {t('footer.rights')}</p>
          <p className="mt-2 text-xs">
            {t('footer.medicalDisclaimer')}
          </p>
        </div>
      </div>
    </footer>
  )
}
