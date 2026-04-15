'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Heart, Calendar, Lightbulb, MessageSquare, Users, Settings, ShoppingBag, LogOut, User, Plus, BarChart3 } from 'lucide-react'
import { logout } from '@/lib/auth-client'

export function NavigationBar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

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
    { href: '/dashboard', label: 'Cycle', icon: Calendar },
    { href: '/tracking', label: 'Track', icon: Plus },
    { href: '/analytics', label: 'Analysis', icon: BarChart3 },
    { href: '/insights', label: 'Insights', icon: Lightbulb },
    { href: '/chatbot', label: 'Chat', icon: MessageSquare },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
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

          {/* Mobile Navigation - 5 tabs like Clue app */}
          <div className="md:hidden flex items-center gap-1">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? 'default' : 'ghost'}
                    size="sm"
                    className="p-2"
                  >
                    <Icon className="h-4 w-4" />
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
