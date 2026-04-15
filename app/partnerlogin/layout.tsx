'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Calendar, MessageSquare, Settings, ShoppingBag, LogOut } from 'lucide-react'
import { Footer } from '@/components/footer'
import { logout } from '@/lib/auth-client'

interface Props {
  children: ReactNode
}

export default function PartnerLoginLayout({ children }: Props) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/auth/login'
    }
  }

  const navItems = [
    { href: '/partnerlogin', label: 'Dashboard', icon: Calendar },
    { href: '/partnerlogin/chat', label: 'Chat', icon: MessageSquare },
    { href: '/partnerlogin/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/partnerlogin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/partnerlogin" className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-2">
                <Heart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="hidden font-semibold text-foreground sm:inline">
                Cycle Companion
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

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-1">
              {navItems.slice(0, 3).map((item) => {
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
              <Button variant="ghost" size="sm" className="p-2">
                <span className="text-xs font-semibold">•••</span>
              </Button>
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

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
