'use client'

import { Heart, CalendarDays, Lightbulb, MessageSquare, Settings, LogOut, User, Plus, BarChart3, Home, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useI18n } from '@/components/i18n/language-provider'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth-client'

export function NavigationBar() {
  const pathname = usePathname()
  const { t } = useI18n()

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if API call fails
      window.location.href = '/auth/login'
    }
  }

  const navItems = [
    { href: '/home', label: t('nav.home'), icon: Home },
    { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    { href: '/tracking', label: t('nav.track'), icon: Plus },
    { href: '/analytics', label: t('nav.analysis'), icon: BarChart3 },
    { href: '/insights', label: t('nav.insights'), icon: Lightbulb },
    { href: '/learn', label: t('nav.learn'), icon: BookOpen },
    { href: '/chatbot', label: t('nav.chat'), icon: MessageSquare },
    { href: '/profile', label: t('nav.profile'), icon: User },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <nav className="sticky top-0 z-40 hidden border-b border-border bg-card/90 shadow-sm backdrop-blur md:block">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-semibold text-foreground sm:inline">{t('app.name')}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive(item.href) ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
          {/* Logout Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 hidden sm:flex"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
