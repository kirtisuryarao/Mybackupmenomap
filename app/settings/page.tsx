'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCycleData } from '@/hooks/use-cycle-data'
import { formatDate, parseDate } from '@/lib/cycle-calculations'
import { authenticatedFetch } from '@/lib/auth-client'
import { Settings, Bell, Eye, Lock, LogOut, Download, Trash2 } from 'lucide-react'
import { logout } from '@/lib/auth-client'

export default function SettingsPage() {
  const { cycleData, updateCycleData, isLoading } = useCycleData()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    lastPeriodDate: '',
    cycleLength: '28',
  })
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
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<'data' | 'account' | null>(null)

  // Load settings from server on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await authenticatedFetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.notifications) setNotifications(data.notifications)
          if (data.privacy) setPrivacy(data.privacy)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (cycleData && cycleData.lastPeriodDate) {
      setEditData({
        lastPeriodDate: cycleData.lastPeriodDate,
        cycleLength: cycleData.cycleLength?.toString() || '28',
      })
    }
  }, [cycleData])

  const handleUpdateCycle = async () => {
    if (editData.lastPeriodDate && editData.cycleLength) {
      const cycleLength = parseInt(editData.cycleLength)
      if (cycleLength >= 20 && cycleLength <= 40) {
        console.log('[Settings] Updating cycle with:', { 
          lastPeriodDate: editData.lastPeriodDate, 
          cycleLength 
        })
        try {
          await updateCycleData(editData.lastPeriodDate, cycleLength)
          console.log('[Settings] Cycle update completed')
          setIsEditing(false)
          setSaveMessage('Cycle information updated successfully!')
          // Wait a moment for all listeners to update
          setTimeout(() => setSaveMessage(''), 3000)
        } catch (error) {
          console.error('[Settings] Failed to update cycle:', error)
          setSaveMessage('Failed to update cycle information. Please try again.')
          setTimeout(() => setSaveMessage(''), 3000)
        }
      }
    }
  }

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] }
    setNotifications(updated)
    try {
      await authenticatedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updated }),
      })
    } catch (error) {
      console.error('Failed to save notification setting:', error)
      // Revert on failure
      setNotifications(notifications)
    }
  }

  const handlePrivacyChange = async (key: keyof typeof privacy) => {
    const updated = { ...privacy, [key]: !privacy[key] }
    setPrivacy(updated)
    try {
      await authenticatedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: updated }),
      })
    } catch (error) {
      console.error('Failed to save privacy setting:', error)
      // Revert on failure
      setPrivacy(privacy)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await authenticatedFetch('/api/export?type=all')
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `menomap-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        setSaveMessage('Data exported successfully!')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (error) {
      console.error('Export failed:', error)
      setSaveMessage('Failed to export data.')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const handleDeleteAllData = async () => {
    if (confirmDelete !== 'data') {
      setConfirmDelete('data')
      return
    }
    try {
      // Delete all logs, cycles, predictions - keeps account
      await authenticatedFetch('/api/logs', { method: 'DELETE' })
      setSaveMessage('All tracking data deleted.')
      setConfirmDelete(null)
      setTimeout(() => setSaveMessage(''), 3000)
      window.dispatchEvent(new CustomEvent('menomap:logs-updated'))
    } catch (error) {
      console.error('Delete data failed:', error)
      setSaveMessage('Failed to delete data.')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if API call fails
      window.location.href = '/auth/login'
    }
  }

  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="text-center py-12">Loading settings...</div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your cycle information, notifications, and preferences
          </p>
        </div>

        {/* Success Message */}
        {saveMessage && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">
            {saveMessage}
          </div>
        )}

        {/* Cycle Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cycle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <div className="space-y-4">
                {cycleData && cycleData.lastPeriodDate ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Last Period Date</p>
                        <p className="font-semibold text-foreground">
                          {new Date(cycleData.lastPeriodDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Cycle Length</p>
                        <p className="font-semibold text-foreground">{cycleData.cycleLength} days</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                      Edit Cycle Information
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">No cycle data loaded yet</p>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full">
                      Add Cycle Information
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="last-period-date">Last Period Start Date</Label>
                  <Input
                    id="last-period-date"
                    type="date"
                    value={editData.lastPeriodDate}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, lastPeriodDate: e.target.value }))
                    }
                    max={formatDate(new Date())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cycle-length">Cycle Length (days)</Label>
                  <Input
                    id="cycle-length"
                    type="number"
                    min="20"
                    max="40"
                    value={editData.cycleLength}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, cycleLength: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Usually 21-40 days</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateCycle} className="flex-1">
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Period Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get reminded when your period is about to start
                </p>
              </div>
              <Switch
                checked={notifications.periodReminder}
                onCheckedChange={() => handleNotificationChange('periodReminder')}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">Phase Change Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Notify me when my cycle phase changes
                </p>
              </div>
              <Switch
                checked={notifications.phaseChange}
                onCheckedChange={() => handleNotificationChange('phaseChange')}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Allow notifications from the app
                </p>
              </div>
              <Switch
                checked={notifications.pushNotifications}
                onCheckedChange={() => handleNotificationChange('pushNotifications')}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={notifications.emailNotifications}
                onCheckedChange={() => handleNotificationChange('emailNotifications')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy & Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Public Profile</p>
                <p className="text-sm text-muted-foreground">
                  Other users can see my profile
                </p>
              </div>
              <Switch
                checked={privacy.profilePublic}
                onCheckedChange={() => handlePrivacyChange('profilePublic')}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">Share with Partner</p>
                <p className="text-sm text-muted-foreground">
                  Allow my partner to see my cycle information
                </p>
              </div>
              <Switch
                checked={privacy.shareWithPartner}
                onCheckedChange={() => handlePrivacyChange('shareWithPartner')}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <p className="font-medium">Health Insights</p>
                <p className="text-sm text-muted-foreground">
                  Allow us to use your data for health insights
                </p>
              </div>
              <Switch
                checked={privacy.allowHealthInsight}
                onCheckedChange={() => handlePrivacyChange('allowHealthInsight')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-4">Account Actions</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Download My Data
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These actions cannot be undone. Please proceed with caution.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteAllData}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {confirmDelete === 'data' ? 'Click again to confirm deletion' : 'Delete All Data'}
                </Button>
              </div>
              {confirmDelete && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">App Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Version:</span> 1.0.0
              </p>
              <p>
                <span className="font-semibold text-foreground">Last Updated:</span> February 25, 2026
              </p>
              <p className="pt-2">
                For support, visit our help center or contact support@cyclecompanion.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}
