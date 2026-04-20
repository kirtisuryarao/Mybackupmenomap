'use client'

import { Eye, EyeOff } from 'lucide-react'

import { useI18n } from '@/components/i18n/language-provider'
import { usePrivacy } from '@/components/privacy/privacy-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface PrivacyControlsCardProps {
  showIcon?: boolean
  showDescription?: boolean
  compact?: boolean
}

export function PrivacyControlsCard({ showIcon = true, showDescription = true, compact = false }: PrivacyControlsCardProps) {
  const { preferences, setPreferences } = usePrivacy()
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {showIcon && <Eye className="h-5 w-5" />}
          <CardTitle className={compact ? 'text-base' : 'text-lg'}>{t('settings.privacy')}</CardTitle>
        </div>
        {showDescription && <CardDescription>Control what's visible when someone is near your screen.</CardDescription>}
      </CardHeader>
      <CardContent className={compact ? 'space-y-3' : 'space-y-4'}>
        <div className="flex items-center justify-between">
          <Label htmlFor="hide-sensitive-card" className={compact ? 'text-sm' : ''}>
            {t('settings.hideSensitive')}
          </Label>
          <Switch
            id="hide-sensitive-card"
            checked={preferences.hideSensitiveData}
            onCheckedChange={(value) => setPreferences({ hideSensitiveData: value })}
          />
        </div>

        <div className={`flex items-center justify-between ${compact ? '' : 'border-t border-border pt-4'}`}>
          <Label htmlFor="blur-cycle-card" className={compact ? 'text-sm' : ''}>
            {t('settings.blurCycle')}
          </Label>
          <Switch
            id="blur-cycle-card"
            checked={preferences.blurCycleData}
            onCheckedChange={(value) => setPreferences({ blurCycleData: value })}
          />
        </div>

        <div className={`flex items-center justify-between ${compact ? '' : 'border-t border-border pt-4'}`}>
          <Label htmlFor="blur-symptoms-card" className={compact ? 'text-sm' : ''}>
            {t('settings.blurSymptoms')}
          </Label>
          <Switch
            id="blur-symptoms-card"
            checked={preferences.blurSymptoms}
            onCheckedChange={(value) => setPreferences({ blurSymptoms: value })}
          />
        </div>

        <div className={`flex items-center justify-between ${compact ? '' : 'border-t border-border pt-4'}`}>
          <Label htmlFor="blur-notes-card" className={compact ? 'text-sm' : ''}>
            {t('settings.blurNotes')}
          </Label>
          <Switch
            id="blur-notes-card"
            checked={preferences.blurNotes}
            onCheckedChange={(value) => setPreferences({ blurNotes: value })}
          />
        </div>

        <div className={`rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground ${compact ? 'mt-2' : 'mt-4'}`}>
          <p className="flex items-center gap-2">
            <EyeOff className="h-3 w-3" />
            When enabled, sensitive data appears blurred or hidden from view.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
