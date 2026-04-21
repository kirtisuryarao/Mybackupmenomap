'use client'

import { Bell, Download, Eye, Lock, LogOut, Palette, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useI18n } from '@/components/i18n/language-provider'
import { LanguageToggle } from '@/components/i18n/language-toggle'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { AppLockCard } from '@/components/privacy/app-lock-card'
import { PrivacyControlsCard } from '@/components/privacy/privacy-controls-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCycleData } from '@/hooks/use-cycle-data'
import { useProfileData } from '@/hooks/use-profile-data'
import { authenticatedFetch, logout } from '@/lib/auth-client'
import { formatDate } from '@/lib/cycle-calculations'

export default function SettingsPage() {
  const { t } = useI18n()
  const { cycleData, updateCycleData, isLoading } = useCycleData()
  const { profile, updateProfile } = useProfileData()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ lastPeriodDate: '', cycleLength: '28' })
  const [healthProfile, setHealthProfile] = useState({ age: '', periodLength: '5', menopauseStage: 'regular' as 'regular' | 'irregular' | 'perimenopause' | 'menopause' })
  const [notifications, setNotifications] = useState({
    periodReminder: true,
    phaseChange: true,
    pushNotifications: false,
    emailNotifications: false,
  })
  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    shareWithPartner: false,
    allowHealthInsight: true,
  })
  const [saveMessage, setSaveMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<'data' | 'account' | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await authenticatedFetch('/api/settings')
        if (!response.ok) {
          return
        }

        const data = await response.json()
        if (data.notifications) setNotifications(data.notifications)
        if (data.privacy) setPrivacy(data.privacy)
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    void loadSettings()
  }, [])

  useEffect(() => {
    if (!cycleData?.lastPeriodDate) {
      return
    }

    setEditData({
      lastPeriodDate: cycleData.lastPeriodDate,
      cycleLength: cycleData.cycleLength?.toString() || '28',
    })
  }, [cycleData])

  useEffect(() => {
    if (!profile) {
      return
    }

    setHealthProfile({
      age: profile.age === '' ? '' : String(profile.age),
      periodLength: profile.periodLength === '' ? '5' : String(profile.periodLength),
      menopauseStage: profile.menopauseStage,
    })
  }, [profile])

  const showMessage = (message: string) => {
    setSaveMessage(message)
    window.setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleUpdateCycle = async () => {
    if (!editData.lastPeriodDate || !editData.cycleLength) {
      return
    }

    const cycleLength = Number.parseInt(editData.cycleLength, 10)
    if (cycleLength < 20 || cycleLength > 40) {
      return
    }

    try {
      await updateCycleData(editData.lastPeriodDate, cycleLength)
      setIsEditing(false)
      showMessage(t('settings.cycleUpdated'))
    } catch (error) {
      console.error('Failed to update cycle:', error)
      showMessage(t('settings.cycleUpdateFailed'))
    }
  }

  const handleSaveHealthProfile = async () => {
    if (!profile) {
      return
    }

    try {
      await updateProfile({
        ...profile,
        age: healthProfile.age === '' ? '' : Number(healthProfile.age),
        periodLength: Number(healthProfile.periodLength),
        periodDuration: Number(healthProfile.periodLength),
        menopauseStage: healthProfile.menopauseStage,
      })
      showMessage('Health profile updated')
    } catch (error) {
      console.error('Failed to update health profile:', error)
      showMessage('Failed to update health profile')
    }
  }

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const previous = notifications
    const updated = { ...previous, [key]: !previous[key] }
    setNotifications(updated)

    try {
      await authenticatedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updated }),
      })
    } catch (error) {
      console.error('Failed to save notification setting:', error)
      setNotifications(previous)
    }
  }

  const handlePrivacyChange = async (key: keyof typeof privacy) => {
    const previous = privacy
    const updated = { ...previous, [key]: !previous[key] }
    setPrivacy(updated)

    try {
      await authenticatedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: updated }),
      })
    } catch (error) {
      console.error('Failed to save privacy setting:', error)
      setPrivacy(previous)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await authenticatedFetch('/api/export?type=all')
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `menomap-export-${new Date().toISOString().split('T')[0]}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      showMessage(t('settings.dataExported'))
    } catch (error) {
      console.error('Export failed:', error)
      showMessage(t('settings.dataExportFailed'))
    }
  }

  const handleDeleteAllData = async () => {
    if (confirmDelete !== 'data') {
      setConfirmDelete('data')
      return
    }

    try {
      await authenticatedFetch('/api/logs', { method: 'DELETE' })
      setConfirmDelete(null)
      window.dispatchEvent(new CustomEvent('menomap:logs-updated'))
      showMessage(t('settings.dataDeleted'))
    } catch (error) {
      console.error('Delete data failed:', error)
      showMessage(t('settings.dataDeleteFailed'))
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/auth/login'
    }
  }

  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="py-12 text-center">{t('settings.loading')}</div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        {saveMessage && (
          <div className="rounded-lg border border-green-300 bg-green-100 px-4 py-3 text-sm text-green-800">
            {saveMessage}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('settings.appearance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.theme')}</Label>
              <p className="mb-3 text-sm text-muted-foreground">{t('settings.chooseTheme')}</p>
              <ThemeToggle />
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <Label>{t('settings.language')}</Label>
              <p className="mb-3 text-sm text-muted-foreground">{t('settings.selectLanguage')}</p>
              <LanguageToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('settings.cycleInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <div className="space-y-4">
                {cycleData?.lastPeriodDate ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">{t('settings.lastPeriodDate')}</p>
                        <p className="font-semibold text-foreground">
                          {new Date(cycleData.lastPeriodDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">{t('settings.cycleLength')}</p>
                        <p className="font-semibold text-foreground">{cycleData.cycleLength} {t('common.days')}</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                      {t('settings.editCycleInformation')}
                    </Button>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="mb-4 text-muted-foreground">{t('settings.noCycleData')}</p>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                      {t('settings.addCycleInformation')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="last-period-date">{t('settings.lastPeriodStartDate')}</Label>
                  <Input
                    id="last-period-date"
                    type="date"
                    value={editData.lastPeriodDate}
                    onChange={(event) => setEditData((prev) => ({ ...prev, lastPeriodDate: event.target.value }))}
                    max={formatDate(new Date())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cycle-length">{t('settings.cycleLengthDays')}</Label>
                  <Input
                    id="cycle-length"
                    type="number"
                    min="20"
                    max="40"
                    value={editData.cycleLength}
                    onChange={(event) => setEditData((prev) => ({ ...prev, cycleLength: event.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.cycleLengthHint')}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateCycle} className="flex-1">
                    {t('settings.saveChanges')}
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                    {t('settings.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Menopause and symptom profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-age">Age</Label>
                <Input
                  id="settings-age"
                  type="number"
                  min="1"
                  max="120"
                  value={healthProfile.age}
                  onChange={(event) => setHealthProfile((prev) => ({ ...prev, age: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-period-length">Period length (days)</Label>
                <Input
                  id="settings-period-length"
                  type="number"
                  min="1"
                  max="15"
                  value={healthProfile.periodLength}
                  onChange={(event) => setHealthProfile((prev) => ({ ...prev, periodLength: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-menopause-stage">Menopause stage</Label>
              <Select
                value={healthProfile.menopauseStage}
                onValueChange={(value: 'regular' | 'irregular' | 'perimenopause' | 'menopause') =>
                  setHealthProfile((prev) => ({ ...prev, menopauseStage: value }))
                }
              >
                <SelectTrigger id="settings-menopause-stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">regular</SelectItem>
                  <SelectItem value="irregular">irregular</SelectItem>
                  <SelectItem value="perimenopause">perimenopause</SelectItem>
                  <SelectItem value="menopause">menopause</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveHealthProfile} className="w-full">
              Save menopause profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('settings.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.periodReminders')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.periodRemindersHint')}</p>
              </div>
              <Switch checked={notifications.periodReminder} onCheckedChange={() => handleNotificationChange('periodReminder')} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">{t('settings.phaseChangeAlerts')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.phaseChangeAlertsHint')}</p>
              </div>
              <Switch checked={notifications.phaseChange} onCheckedChange={() => handleNotificationChange('phaseChange')} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">{t('settings.pushNotifications')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.pushNotificationsHint')}</p>
              </div>
              <Switch checked={notifications.pushNotifications} onCheckedChange={() => handleNotificationChange('pushNotifications')} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">{t('settings.emailNotifications')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.emailNotificationsHint')}</p>
              </div>
              <Switch checked={notifications.emailNotifications} onCheckedChange={() => handleNotificationChange('emailNotifications')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('settings.privacyVisibility')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.publicProfile')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.publicProfileHint')}</p>
              </div>
              <Switch checked={privacy.profilePublic} onCheckedChange={() => handlePrivacyChange('profilePublic')} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">{t('settings.shareWithPartner')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.shareWithPartnerHint')}</p>
              </div>
              <Switch checked={privacy.shareWithPartner} onCheckedChange={() => handlePrivacyChange('shareWithPartner')} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">{t('settings.healthInsights')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.healthInsightsHint')}</p>
              </div>
              <Switch checked={privacy.allowHealthInsight} onCheckedChange={() => handlePrivacyChange('allowHealthInsight')} />
            </div>
          </CardContent>
        </Card>

        <PrivacyControlsCard />
        <AppLockCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('settings.account')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-4 font-medium">{t('settings.accountActions')}</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('settings.downloadMyData')}
                </Button>
                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('settings.dangerZone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('settings.dangerZoneHint')}</p>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDeleteAllData}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {confirmDelete === 'data' ? t('settings.confirmDeleteData') : t('settings.deleteAllData')}
                </Button>
              </div>
              {confirmDelete && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                  {t('settings.cancel')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">{t('settings.appInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{t('settings.version')}:</span> 1.0.0
              </p>
              <p>
                <span className="font-semibold text-foreground">{t('settings.lastUpdated')}:</span> February 25, 2026
              </p>
              <p className="pt-2">{t('settings.supportText')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}