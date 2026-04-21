'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in via access_token (matches auth-client.ts)
    const accessToken = localStorage.getItem('access_token')
    
    if (accessToken) {
      // Redirect to dashboard
      router.push('/home')
    } else {
      // Redirect to login
      router.push('/auth/login')
    }
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
