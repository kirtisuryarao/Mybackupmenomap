'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      <Button
        type="button"
        size="sm"
        variant={theme === 'light' ? 'default' : 'ghost'}
        onClick={() => setTheme('light')}
        aria-label="Switch to light theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={theme === 'dark' ? 'default' : 'ghost'}
        onClick={() => setTheme('dark')}
        aria-label="Switch to dark theme"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={theme === 'system' ? 'default' : 'ghost'}
        onClick={() => setTheme('system')}
        aria-label="Use system theme"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  )
}
