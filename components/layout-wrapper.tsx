'use client'

import { ReactNode } from 'react'
import { NavigationBar } from './navigation-bar'
import { BottomNav } from './BottomNav'
import { Footer } from './footer'

interface LayoutWrapperProps {
  children: ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-rose-50/30">
      <NavigationBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8 lg:px-8">
        <div>
          {children}
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <BottomNav />
    </div>
  )
}
