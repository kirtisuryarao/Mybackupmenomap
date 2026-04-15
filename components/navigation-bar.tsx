'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Heart, CalendarDays, Lightbulb, MessageSquare, Settings, LogOut, User, Plus, BarChart3, Home } from 'lucide-react'
import { logout } from '@/lib/auth-client'

export function NavigationBar() {
  const pathname = usePathname()

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
    { href: '/home', label: 'Home', icon: Home },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/tracking', label: 'Track', icon: Plus },
    { href: '/analytics', label: 'Analysis', icon: BarChart3 },
    { href: '/insights', label: 'Insights', icon: Lightbulb },
    { href: '/chatbot', label: 'Chat', icon: MessageSquare },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
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
            <span className="hidden font-semibold text-foreground sm:inline">
              MenoMap
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
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
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
