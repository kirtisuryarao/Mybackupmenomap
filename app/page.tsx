'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { refreshAccessToken } from '@/lib/auth-client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function bootstrapSession() {
      const accessToken = localStorage.getItem('access_token')

      if (accessToken) {
        router.push('/home')
        return
      }

      try {
        await refreshAccessToken()
        router.push('/home')
      } catch {
        router.push('/auth/login')
      }
    }

    void bootstrapSession()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Loading MenoMap...
        </div>
      </div>
    </div>
  )
}
