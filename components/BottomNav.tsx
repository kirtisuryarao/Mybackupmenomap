'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, Plus, User, BarChart3 } from 'lucide-react'

const items = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/analytics', label: 'Analysis', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
]

function isPathActive(pathname: string, href: string) {
  if (href === '/home') {
    return pathname === '/home' || pathname === '/'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-teal-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden">
      <div className="mx-auto grid h-20 max-w-md grid-cols-5 items-center px-3">
        <Link
          href={items[0].href}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-medium transition-colors ${
            isPathActive(pathname, items[0].href) ? 'text-teal-700' : 'text-slate-500'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>{items[0].label}</span>
        </Link>

        <Link
          href={items[1].href}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-medium transition-colors ${
            isPathActive(pathname, items[1].href) ? 'text-teal-700' : 'text-slate-500'
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span>{items[1].label}</span>
        </Link>

        <Link href="/tracking" aria-label="Track today" className="flex items-center justify-center">
          <span className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white shadow-[0_10px_25px_rgba(13,148,136,0.35)] transition-transform hover:scale-105">
            <Plus className="h-7 w-7" />
          </span>
        </Link>

        <Link
          href={items[2].href}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-medium transition-colors ${
            isPathActive(pathname, items[2].href) ? 'text-teal-700' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          <span>{items[2].label}</span>
        </Link>

        <Link
          href={items[3].href}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-medium transition-colors ${
            isPathActive(pathname, items[3].href) ? 'text-teal-700' : 'text-slate-500'
          }`}
        >
          <User className="h-5 w-5" />
          <span>{items[3].label}</span>
        </Link>
      </div>
    </nav>
  )
}
