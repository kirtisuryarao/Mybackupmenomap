'use client'

import { ShieldCheck } from 'lucide-react'
import { FormEvent, useState } from 'react'

import { usePrivacy } from '@/components/privacy/privacy-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function AppLockGate() {
  const { locked, unlockWithPin } = usePrivacy()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  if (!locked) {
    return null
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!unlockWithPin(pin)) {
      setError('That PIN did not match. Please try again.')
      return
    }

    setError('')
    setPin('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" />
            App lock enabled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your PIN to unlock your private health data.
            </p>
            <Input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              type="password"
              minLength={4}
              maxLength={6}
              placeholder="Enter PIN"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Unlock app
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
