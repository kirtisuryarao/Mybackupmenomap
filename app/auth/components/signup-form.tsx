'use client'

import { Heart, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { signup } from '@/lib/auth-client'
import { formatDate } from '@/lib/cycle-calculations'

export function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '45',
    lastPeriodDate: '',
    cycleLength: '28',
    periodLength: '5',
    menopauseStage: 'regular' as 'regular' | 'irregular' | 'perimenopause' | 'menopause',
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
      const age = parseInt(formData.age)
      if (!age || age < 1 || age > 120) {
        setError('Please enter a valid age')
        return
      }

      const cycleLength = parseInt(formData.cycleLength)
      if (cycleLength < 20 || cycleLength > 40) {
        setError('Cycle length should be between 20 and 40 days')
        setIsLoading(false)
        return
      }

      const periodLength = parseInt(formData.periodLength)
      if (periodLength < 1 || periodLength > 15) {
        setError('Period length should be between 1 and 15 days')
        setIsLoading(false)
        return
      }

      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age,
        lastPeriodDate: formData.lastPeriodDate || undefined,
        cycleLength: cycleLength,
        periodLength,
        menopauseStage: formData.menopauseStage,
      })

      // Redirect to home
      window.location.href = '/home'
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
            Join MenoMap to start tracking your health
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
              Next: Health Profile
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
        <CardTitle className="text-center text-2xl">Your Health Profile</CardTitle>
        <CardDescription className="text-center">
          Help us personalize tracking for your stage and symptoms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCycleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              name="age"
              type="number"
              min="1"
              max="120"
              value={formData.age}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menopauseStage">Menopause Stage</Label>
            <Select
              value={formData.menopauseStage}
              onValueChange={(value: 'regular' | 'irregular' | 'perimenopause' | 'menopause') =>
                setFormData((prev) => ({ ...prev, menopauseStage: value }))
              }
            >
              <SelectTrigger id="menopauseStage">
                <SelectValue placeholder="Select your stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">regular</SelectItem>
                <SelectItem value="irregular">irregular</SelectItem>
                <SelectItem value="perimenopause">perimenopause</SelectItem>
                <SelectItem value="menopause">menopause</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              Optional. Leave blank if you are not currently tracking periods.
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
            <Label htmlFor="periodLength">Average Period Length (days)</Label>
            <Input
              id="periodLength"
              name="periodLength"
              type="number"
              min="1"
              max="15"
              value={formData.periodLength}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground">
              Typical bleeding duration in days.
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
