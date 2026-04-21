import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

import { CycleCalendar } from '@/components/cycle-calendar'
import { DailyInsightCard } from '@/components/daily-insight-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Partner - MenoMap',
  description: 'View your partner’s health overview',
}

export default function PartnerPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Welcome</h1>
        <p className="text-muted-foreground">View your partner's health details below</p>
      </div>

      {/* Partner's Calendar heading */}
      <div>
        <h2 className="text-xl font-semibold">This is your partner&#39;s calendar</h2>
      </div>

      {/* Reuse components from dashboard */}
      <DailyInsightCard />

      <CycleCalendar />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cycle Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Until Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logged Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">this cycle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">cycles tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Educational Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Understanding Your Partner's Cycle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Menstrual Phase (Days 1-5)</h3>
              <p className="text-sm text-muted-foreground">
                Hormone levels drop, triggering bleeding. Energy levels are typically lower.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Follicular Phase (Days 1-13)</h3>
              <p className="text-sm text-muted-foreground">
                Estrogen rises, boosting mood and energy. Great time for new projects.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Ovulation (Day 14)</h3>
              <p className="text-sm text-muted-foreground">
                Peak hormones and confidence. The most fertile window. Energy is at its peak.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Luteal Phase (Days 15-28)</h3>
              <p className="text-sm text-muted-foreground">
                Progesterone rises then falls. May experience PMS symptoms. Introspection time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/insights">
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base">View Full Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get detailed phase-specific advice for health and wellness.
              </p>
              <Button variant="outline" size="sm">
                Explore
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chatbot">
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base">Ask AI Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Chat with our AI for personalized health guidance.
              </p>
              <Button variant="outline" size="sm">
                Chat Now
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}