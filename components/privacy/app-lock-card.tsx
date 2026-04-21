'use client'

import { Lock, LockOpen } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/components/i18n/language-provider'
import { usePrivacy } from '@/components/privacy/privacy-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AppLockCard() {
  const { t, locale } = useI18n()
  const { preferences, savePin, disablePin, setPreferences, lockNow } = usePrivacy()
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoLockMinutes, setAutoLockMinutes] = useState(preferences.autoLockMinutes.toString())

  const isPinSet = Boolean(preferences.pinHash)
  const minuteLabel = locale === 'hi' ? 'मिनट' : 'minutes'

  useEffect(() => {
    setAutoLockMinutes(preferences.autoLockMinutes.toString())
  }, [preferences.autoLockMinutes])

  const handleSetPin = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (pin.length < 4 || pin.length > 6) {
      setError(t('settings.pinLengthError'))
      return
    }

    if (!/^\d+$/.test(pin)) {
      setError(t('settings.pinDigitsError'))
      return
    }

    if (pin !== confirmPin) {
      setError(t('settings.pinConfirmError'))
      return
    }

    try {
      savePin(pin)
      setSuccess(t('settings.pinSaved'))
      setPin('')
      setConfirmPin('')
      setIsSettingPin(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : t('common.friendlyError'))
    }
  }

  const handleDisableLock = () => {
    disablePin()
    setError('')
    setSuccess(t('settings.pinDisabled'))
  }

  const handleAutoLockUpdate = () => {
    const minutes = Number.parseInt(autoLockMinutes, 10)
    if (Number.isNaN(minutes) || minutes < 1 || minutes > 60) {
      setError(t('settings.autoLockMinutes'))
      return
    }

    setPreferences({ autoLockMinutes: minutes })
    setError('')
    setSuccess(t('settings.update'))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {isPinSet ? <Lock className="h-5 w-5 text-green-600" /> : <LockOpen className="h-5 w-5" />}
          <CardTitle>{t('settings.appLockSecurity')}</CardTitle>
        </div>
        <CardDescription>{t('settings.appLockDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            {isPinSet ? t('settings.appLockEnabledStatus') : t('settings.appLockDisabledStatus')}
          </p>
          {isPinSet && (
            <p className="mt-2 text-xs text-blue-800 dark:text-blue-300">
              {t('settings.appLockTimeoutStatus')} {preferences.autoLockMinutes} {minuteLabel}.
            </p>
          )}
        </div>

        {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">{success}</div>}
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

        {isPinSet && !isSettingPin && (
          <div className="space-y-3 border-t border-border pt-4">
            <Label htmlFor="auto-lock-minutes">{t('settings.autoLockAfter')}</Label>
            <div className="flex gap-2">
              <Input
                id="auto-lock-minutes"
                type="number"
                min="1"
                max="60"
                value={autoLockMinutes}
                onChange={(event) => setAutoLockMinutes(event.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleAutoLockUpdate}>
                {t('settings.update')}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={lockNow}>
              {t('settings.lockNow')}
            </Button>
          </div>
        )}

        {!isPinSet || isSettingPin ? (
          <form onSubmit={handleSetPin} className="space-y-4 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="set-pin">{t('settings.createPin')}</Label>
              <Input
                id="set-pin"
                type="password"
                inputMode="numeric"
                placeholder={t('settings.enterPin')}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin">{t('settings.confirmPin')}</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                placeholder={t('settings.reenterPin')}
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
              />
            </div>

            <p className="text-xs text-muted-foreground">{t('settings.pinHint')}</p>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {isPinSet ? t('settings.updatePin') : t('settings.enableAppLock')}
              </Button>
              {isSettingPin && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsSettingPin(false)
                    setPin('')
                    setConfirmPin('')
                    setError('')
                  }}
                >
                  {t('settings.cancel')}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <Button variant="outline" className="w-full" onClick={() => setIsSettingPin(true)}>
              {t('settings.changePin')}
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleDisableLock}>
              {t('settings.disablePin')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}