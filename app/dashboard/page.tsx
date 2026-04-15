'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { CycleCalendar } from '@/components/cycle-calendar'
import { DailyInsightCard } from '@/components/daily-insight-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar, TrendingUp, Activity, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCycleData } from '@/hooks/use-cycle-data'
import { authenticatedFetch } from '@/lib/auth-client'
import { getPhaseHormoneInfo } from '@/lib/cycle-engine'

export default function DashboardPage() {
  const { cycleData, todayInfo, isLoading } = useCycleData()
  const [prediction, setPrediction] = useState<{
    predictedPeriodDate: string
    ovulationDate: string
    confidence: number
  } | null>(null)
  const [stats, setStats] = useState<{
    totalLogs: number
    cyclesTracked: number
    avgCycleLength: number
  }>({ totalLogs: 0, cyclesTracked: 0, avgCycleLength: 28 })

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [predRes, analyticsRes] = await Promise.all([
          authenticatedFetch('/api/prediction'),
          authenticatedFetch('/api/analytics'),
        ])
        if (predRes.ok) setPrediction(await predRes.json())
        if (analyticsRes.ok) {
          const data = await analyticsRes.json()
          setStats({
            totalLogs: data.totalLogsRecorded || 0,
            cyclesTracked: data.totalCyclesTracked || 0,
            avgCycleLength: data.avgCycleLength || 28,
          })
        }
      } catch (err) {
        console.error('Dashboard data load error:', err)
      }
    }
    loadDashboardData()
  }, [])

  // Days until next period
  const daysUntilPeriod = prediction
    ? Math.max(0, Math.ceil(
        (new Date(prediction.predictedPeriodDate + 'T00:00:00').getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
      ))
    : null

  // Hormone info for current phase
  const phaseInfo = todayInfo ? getPhaseHormoneInfo(todayInfo.phase) : null

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Current Cycle</h1>
            <p className="text-muted-foreground">
              {todayInfo
                ? `Day ${todayInfo.dayOfCycle} · ${phaseInfo?.title || todayInfo.phase}`
                : 'Loading...'}
            </p>
          </div>
          <Link href="/tracking">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Log Today
            </Button>
          </Link>
        </div>

        {/* Daily Insight Card */}
        <DailyInsightCard />

        {/* Phase Hormone Info (like Clue app) */}
        {phaseInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">{phaseInfo.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{phaseInfo.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Hormones</h4>
                  <div className="space-y-1">
                    {phaseInfo.hormones.map(h => (
                      <div key={h.name} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">
                          {h.trend === 'rising' ? '↑' : h.trend === 'falling' ? '↓' : h.trend === 'peak' ? '⬆' : '—'}
                        </Badge>
                        <span>{h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Common Experiences</h4>
                  <ul className="space-y-1">
                    {phaseInfo.commonExperiences.map((exp, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {exp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <CycleCalendar />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cycle Length
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgCycleLength}</div>
              <p className="text-xs text-muted-foreground">days avg</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Days Until Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {daysUntilPeriod !== null ? daysUntilPeriod : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {daysUntilPeriod === 0 ? 'today!' : 'days'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Logged Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
              <p className="text-xs text-muted-foreground">daily logs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cycles Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cyclesTracked}</div>
              <p className="text-xs text-muted-foreground">cycles</p>
            </CardContent>
          </Card>
        </div>

        {/* How do you feel today? */}
        <Link href="/tracking">
          <Card className="hover:bg-accent/5 transition-colors cursor-pointer border-orange-200 dark:border-orange-800">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">😊</span>
                <span className="font-medium">How do you feel today?</span>
              </div>
              <span className="text-primary font-bold text-xl">›</span>
            </CardContent>
          </Card>
        </Link>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/analytics">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  View Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Cycle statistics, mood trends, and temperature charts.
                </p>
                <Button variant="outline" size="sm">Explore</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/insights">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Phase Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Phase-specific health tips and nutrition advice.
                </p>
                <Button variant="outline" size="sm">Learn</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/chatbot">
            <Card className="hover:bg-accent/5 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Chat with our AI for personalized guidance.
                </p>
                <Button variant="outline" size="sm">Chat</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </LayoutWrapper>
  )
}
