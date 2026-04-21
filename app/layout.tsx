import { Analytics } from '@vercel/analytics/next'
import { Geist, Geist_Mono } from 'next/font/google'

import { AppProviders } from '@/components/app-providers'
import { ChatWidget } from '@/components/chat-widget'
import { AppLockGate } from '@/components/privacy/app-lock-gate'

import type { Metadata } from 'next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MenoMap - Menopause-Aware Health Tracking',
  description: 'Track symptoms, sleep, mood, and cycle data with menopause-aware insights and private health tools.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProviders>
          <AppLockGate />
          {children}
        </AppProviders>
        <ChatWidget />
        <Analytics />
      </body>
    </html>
  )
}
