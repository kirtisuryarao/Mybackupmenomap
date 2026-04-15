'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const userSession = localStorage.getItem('user_session')
    
    if (userSession) {
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
          Loading Cycle Companion...
        </div>
      </div>
    </div>
  )
}
