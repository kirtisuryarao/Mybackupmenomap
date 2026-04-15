'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Bell, Users, Lock, Clock, Lightbulb, User } from 'lucide-react'

export default function PartnerSettingsPage() {
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    periodReminder: true,
    pmsAwareness: true,
    moodSupport: false,
    cyclePhase: true,
  })

  // Reminder timing state
  const [reminderTiming, setReminderTiming] = useState('2')

  const handleNotificationChange = (key: string, checked: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: checked }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Partner Settings</h1>
        <p className="text-muted-foreground">
          Manage your partner connection preferences and notifications
        </p>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="period-reminder"
              checked={notifications.periodReminder}
              onCheckedChange={(checked) => handleNotificationChange('periodReminder', checked as boolean)}
            />
            <Label htmlFor="period-reminder">Receive Period Reminder Alerts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pms-awareness"
              checked={notifications.pmsAwareness}
              onCheckedChange={(checked) => handleNotificationChange('pmsAwareness', checked as boolean)}
            />
            <Label htmlFor="pms-awareness">Receive PMS Awareness Alerts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mood-support"
              checked={notifications.moodSupport}
              onCheckedChange={(checked) => handleNotificationChange('moodSupport', checked as boolean)}
            />
            <Label htmlFor="mood-support">Receive Mood Support Suggestions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cycle-phase"
              checked={notifications.cyclePhase}
              onCheckedChange={(checked) => handleNotificationChange('cyclePhase', checked as boolean)}
            />
            <Label htmlFor="cycle-phase">Receive Cycle Phase Updates</Label>
          </div>
        </CardContent>
      </Card>

      {/* Partner Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partner Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Connected With:</p>
            <p className="text-sm text-muted-foreground">Name: Sarah Johnson</p>
            <p className="text-sm text-muted-foreground">Status: Active</p>
            <p className="text-sm text-muted-foreground">Connected Since: March 2026</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Disconnect Partner
            </Button>
            <Button variant="outline" size="sm">
              Request Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="support-insights" defaultChecked />
            <Label htmlFor="support-insights">View only support insights</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="no-medical-logs" defaultChecked />
            <Label htmlFor="no-medical-logs">Do not display medical logs</Label>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Reminder Customization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Period Reminder Timing</Label>
            <RadioGroup value={reminderTiming} onValueChange={setReminderTiming}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="1-day" />
                <Label htmlFor="1-day">1 day before</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="2-days" />
                <Label htmlFor="2-days">2 days before</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="3-days" />
                <Label htmlFor="3-days">3 days before</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Support Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Support Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm">Menstrual Phase</h4>
            <ul className="text-sm text-muted-foreground ml-4 mt-1">
              <li>• Offer comfort and understanding</li>
              <li>• Avoid heavy plans or activities</li>
            </ul>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm">PMS Phase</h4>
            <ul className="text-sm text-muted-foreground ml-4 mt-1">
              <li>• Be patient and supportive</li>
              <li>• Encourage rest and self-care</li>
            </ul>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm">Follicular Phase</h4>
            <ul className="text-sm text-muted-foreground ml-4 mt-1">
              <li>• Support new projects and energy</li>
              <li>• Plan fun activities together</li>
            </ul>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm">Luteal Phase</h4>
            <ul className="text-sm text-muted-foreground ml-4 mt-1">
              <li>• Be understanding of mood changes</li>
              <li>• Help with stress management</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline">Edit Name</Button>
            <Button variant="outline">Change Password</Button>
            <Button variant="outline">Logout</Button>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}