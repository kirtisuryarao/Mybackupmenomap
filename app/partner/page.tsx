'use client'

import { useState } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCycleData } from '@/hooks/use-cycle-data'
import { Users, Bell, Share2, AlertCircle, X, Check } from 'lucide-react'
import { PhaseBadge } from '@/components/phase-badge'

export default function PartnerPage() {
  const { todayInfo, isLoading } = useCycleData()
  const [isAdded, setIsAdded] = useState(false)
  const [partner, setPartner] = useState<{ name: string; phone: string } | null>(null)
  const [newPartner, setNewPartner] = useState({ name: '', phone: '' })
  const [notifications, setNotifications] = useState({
    periodStart: true,
    ovulation: true,
    pms: true,
    phaseChange: true,
  })
  const [partnerView, setPartnerView] = useState(false)

  const handleAddPartner = () => {
    if (newPartner.name && newPartner.phone) {
      setPartner(newPartner)
      setIsAdded(true)
      setNewPartner({ name: '', phone: '' })
    }
  }

  const handleRemovePartner = () => {
    setPartner(null)
    setIsAdded(false)
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (isLoading || !todayInfo) {
    return (
      <LayoutWrapper>
        <div className="text-center">Loading partner settings...</div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Partner Awareness</h1>
          <p className="text-muted-foreground">
            Share your cycle information with your partner to increase understanding and support
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Why Share with Your Partner?</p>
                <p className="text-sm text-muted-foreground">
                  Partners who understand your cycle can offer better support, recognize when you might need extra care, and plan activities accordingly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add/Manage Partner Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Partner Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAdded ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="partner-name">Partner Name</Label>
                      <Input
                        id="partner-name"
                        placeholder="Name"
                        value={newPartner.name}
                        onChange={(e) =>
                          setNewPartner((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-phone">Phone Number</Label>
                      <Input
                        id="partner-phone"
                        type="tel"
                        placeholder="+91 "
                        value={newPartner.phone}
                        onChange={(e) =>
                          setNewPartner((prev) => ({ ...prev, phone: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      onClick={handleAddPartner}
                      disabled={!newPartner.name || !newPartner.phone}
                      className="w-full"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Add Partner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-primary/10 rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-2">Connected Partner</h3>
                      <p className="text-sm text-muted-foreground mb-1">{partner?.name}</p>
                      <p className="text-xs text-muted-foreground">{partner?.phone}</p>
                    </div>
                    <Button
                      onClick={handleRemovePartner}
                      variant="outline"
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Partner
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notifications Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAdded ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Period Starts</label>
                      <Switch
                        checked={notifications.periodStart}
                        onCheckedChange={() => handleNotificationChange('periodStart')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Ovulation Day</label>
                      <Switch
                        checked={notifications.ovulation}
                        onCheckedChange={() => handleNotificationChange('ovulation')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">PMS Phase Begins</label>
                      <Switch
                        checked={notifications.pms}
                        onCheckedChange={() => handleNotificationChange('pms')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Phase Changes</label>
                      <Switch
                        checked={notifications.phaseChange}
                        onCheckedChange={() => handleNotificationChange('phaseChange')}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add a partner to enable notifications
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Current Status Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Today's Phase</p>
                  <div className="flex items-center gap-2">
                    <PhaseBadge phase={todayInfo.phase} dayNumber={todayInfo.dayOfCycle} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">What Your Partner Should Know</p>
                  <div className="bg-muted rounded-lg p-3">
                    {todayInfo.phase === 'period' && (
                      <p className="text-xs text-muted-foreground">
                        She's menstruating. She may have lower energy, need extra rest, and appreciate comfort and support.
                      </p>
                    )}
                    {todayInfo.phase === 'follicular' && (
                      <p className="text-xs text-muted-foreground">
                        She's in her follicular phase. Energy and mood are improving. Great time for activities and planning.
                      </p>
                    )}
                    {todayInfo.phase === 'ovulation' && (
                      <p className="text-xs text-muted-foreground">
                        She's ovulating - her peak phase. Confidence is high, communication is excellent. Great time for important events.
                      </p>
                    )}
                    {todayInfo.phase === 'luteal' && (
                      <p className="text-xs text-muted-foreground">
                        She's in her luteal/PMS phase. She may be more sensitive and need extra understanding. Support and patience go a long way.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Preview Section */}
        {isAdded && !partnerView && (
          <Card>
            <CardHeader>
              <CardTitle>What Your Partner Sees</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setPartnerView(true)} variant="outline" className="w-full">
                Preview Partner View
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Partner View Preview */}
        {partnerView && isAdded && (
          <Card className="border-2 border-primary">
            <CardHeader className="border-b border-primary pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Partner View Preview</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPartnerView(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">What your partner can see:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Current cycle phase and day number
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Next predicted period date
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Phase-specific support tips
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    When to expect next ovulation
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Your partner cannot see:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    Your detailed symptoms or symptoms
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    Your notes or journal entries
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    Your health data or medical history
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    Your account login information
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Partner Support Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Period (Days 1-5):</span> She may need more rest, comfort foods, and emotional support. Offer to help with tasks.
            </p>
            <p>
              <span className="font-semibold text-foreground">Follicular (Days 1-13):</span> Her mood improves and energy rises. Great for activities together and planning.
            </p>
            <p>
              <span className="font-semibold text-foreground">Ovulation (Day 14):</span> Peak confidence and energy. Excellent time for important conversations and activities.
            </p>
            <p>
              <span className="font-semibold text-foreground">Luteal/PMS (Days 15-28):</span> She may feel more emotional or sensitive. Patience, understanding, and support are valuable.
            </p>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}
