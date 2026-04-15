'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCycleData } from '@/hooks/use-cycle-data'
import { formatDate, parseDate } from '@/lib/cycle-calculations'
import { Settings, Bell, Eye, Lock, LogOut } from 'lucide-react'
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

  useEffect(() => {
    if (cycleData) {
      setEditData({
        lastPeriodDate: cycleData.lastPeriodDate,
        cycleLength: cycleData.cycleLength.toString(),
      })
    }
  }, [cycleData])

  const handleUpdateCycle = () => {
    if (editData.lastPeriodDate && editData.cycleLength) {
      const cycleLength = parseInt(editData.cycleLength)
      if (cycleLength >= 20 && cycleLength <= 40) {
        updateCycleData(editData.lastPeriodDate, cycleLength)
        setIsEditing(false)
        setSaveMessage('Cycle information updated successfully!')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    }
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePrivacyChange = (key: keyof typeof privacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }))
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
                <Button variant="outline" className="w-full">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  Delete All Data
                </Button>
                <Button variant="destructive">
                  Delete Account
                </Button>
              </div>
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
