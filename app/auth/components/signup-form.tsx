'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heart, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/cycle-calculations'
import { signup } from '@/lib/auth-client'

export function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    lastPeriodDate: '',
    cycleLength: '28',
    partnerPhone: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'account' | 'cycle'>('account')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate account info
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setStep('cycle')
  }

  const handleCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!formData.lastPeriodDate) {
        setError('Please enter your last period date')
        return
      }

      // Validate cycle length
      const cycleLength = parseInt(formData.cycleLength)
      if (cycleLength < 20 || cycleLength > 40) {
        setError('Cycle length should be between 20 and 40 days')
        setIsLoading(false)
        return
      }

      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        lastPeriodDate: formData.lastPeriodDate,
        cycleLength: cycleLength,
        partnerPhone: formData.partnerPhone || undefined,
      })

      // Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  if (step === 'account') {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="rounded-lg bg-primary p-3">
              <Heart className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join Cycle Companion to start tracking your health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Sarah Anderson"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>

            {error && (
              <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full">
              Next: Cycle Information
            </Button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="rounded-lg bg-primary p-3">
            <Heart className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-center text-2xl">Your Cycle Information</CardTitle>
        <CardDescription className="text-center">
          Help us personalize your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCycleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lastPeriodDate">Last Period Start Date</Label>
            <Input
              id="lastPeriodDate"
              name="lastPeriodDate"
              type="date"
              value={formData.lastPeriodDate}
              onChange={handleInputChange}
              max={formatDate(new Date())}
            />
            <p className="text-xs text-muted-foreground">
              The date your last period started
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycleLength">Average Cycle Length (days)</Label>
            <Input
              id="cycleLength"
              name="cycleLength"
              type="number"
              min="20"
              max="40"
              value={formData.cycleLength}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground">
              Usually 21-40 days (28 is average)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partnerPhone">Partner Phone (Optional)</Label>
            <Input
              id="partnerPhone"
              name="partnerPhone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.partnerPhone}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground">
              To send partner notifications (can be added later)
            </p>
          </div>

          {error && (
            <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep('account')}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
