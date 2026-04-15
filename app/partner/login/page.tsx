'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heart, AlertCircle } from 'lucide-react'

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!email || !password) {
        setError('Please fill in all fields')
        setIsLoading(false)
        return
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      // Store tokens in localStorage
      localStorage.setItem('partnerAccessToken', data.accessToken)
      localStorage.setItem('partnerRefreshToken', data.refreshToken)
      localStorage.setItem('partnerId', data.partner.id)
      localStorage.setItem('partnerData', JSON.stringify(data.partner))

      // Redirect to partner dashboard
      window.location.href = '/partner/dashboard'
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="rounded-lg bg-blue-500 p-3">
              <Heart className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Partner Login</h1>
          <p className="text-slate-600">
            Login to view your partner's cycle information and insights
          </p>
        </div>

        <Card className="w-full border-2 border-blue-100 shadow-lg">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="text-center text-2xl text-slate-900">
              Welcome, Partner
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              Support your partner with care and understanding
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In as Partner'}
              </Button>

              <div className="text-center text-sm text-slate-600 pt-4">
                Don't have an account?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                  Ask your partner to add you
                </Link>
              </div>

              <div className="border-t border-blue-100 pt-4">
                <p className="text-xs text-slate-500 text-center">
                  🔒 Your partner must add you as a partner in their profile first
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Support Message */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">💙 Supporting Your Partner</span>
            <br className="mt-2" />
            You'll have read-only access to cycle insights to better understand and support your partner.
          </p>
        </div>
      </div>
    </div>
  )
}
