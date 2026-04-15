'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { authenticatedFetch } from '@/lib/auth-client'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Activity, AlertTriangle, Download, TrendingUp,
  Thermometer, Moon, Heart, Calendar,
} from 'lucide-react'

interface Analytics {
  avgCycleLength: number
  cycleVariation: number
  avgPeriodLength: number
  totalCyclesTracked: number
  isIrregular: boolean
  irregularReason: string | null
  cycleLengths: number[]
  periodLengths: number[]
  moodTrends: Record<string, number>
  symptomTrends: Record<string, number>
  temperatureTrends: { date: string; temperature: number }[]
  totalLogsRecorded: number
}

interface Prediction {
  predictedPeriodDate: string
  ovulationDate: string
  fertileWindowStart: string
  fertileWindowEnd: string
  confidence: number
  method: string
}

const CHART_COLORS = ['#0d9488', '#f43f5e', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#6366f1']

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [analyticsRes, predictionRes] = await Promise.all([
          authenticatedFetch('/api/analytics'),
          authenticatedFetch('/api/prediction'),
        ])

        if (analyticsRes.ok) {
          setAnalytics(await analyticsRes.json())
        }
        if (predictionRes.ok) {
          setPrediction(await predictionRes.json())
        }
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleExport = async () => {
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
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-3">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </LayoutWrapper>
    )
  }

  // Prepare chart data
  const cycleLengthData = analytics?.cycleLengths.map((len, i) => ({
    cycle: `Cycle ${i + 1}`,
    length: len,
  })) || []

  const moodData = Object.entries(analytics?.moodTrends || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const symptomData = Object.entries(analytics?.symptomTrends || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const tempData = analytics?.temperatureTrends || []

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analysis</h1>
            <p className="text-muted-foreground">Your cycle statistics and trends</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Prediction Card */}
        {prediction && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Next Period Prediction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Next Period</p>
                  <p className="text-lg font-bold text-red-500">
                    {new Date(prediction.predictedPeriodDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ovulation</p>
                  <p className="text-lg font-bold text-blue-500">
                    {new Date(prediction.ovulationDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fertile Window</p>
                  <p className="text-lg font-bold text-teal-600">
                    {new Date(prediction.fertileWindowStart + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                    {' – '}
                    {new Date(prediction.fertileWindowEnd + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold">
                    {Math.round(prediction.confidence * 100)}%
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {prediction.method === 'ml' ? 'ML Model' : 'Rule-based'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cycle Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Cycle Length
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.avgCycleLength || 28}</div>
              <p className="text-xs text-muted-foreground">days average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cycle Variation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{analytics?.cycleVariation || 0}</span>
                {analytics?.isIrregular && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Irregular
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">days std deviation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Period Length
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.avgPeriodLength || 5}</div>
              <p className="text-xs text-muted-foreground">days average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cycles Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.totalCyclesTracked || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalLogsRecorded || 0} daily logs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Irregular Warning */}
        {analytics?.isIrregular && analytics.irregularReason && (
          <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Irregular Cycle Detected
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    {analytics.irregularReason}. Consider consulting a healthcare provider.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cycle Length History Chart */}
        {cycleLengthData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cycle Length History</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cycleLengthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cycle" fontSize={12} />
                  <YAxis domain={['auto', 'auto']} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="length" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Temperature Trend */}
        {tempData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Basal Body Temperature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={tempData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={['auto', 'auto']} fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Mood & Symptom Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moodData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  Feelings (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={moodData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, count }) => `${name} (${count})`}
                    >
                      {moodData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {symptomData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Symptoms (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={symptomData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" fontSize={11} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty State */}
        {(!analytics || analytics.totalCyclesTracked === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No data yet</h3>
              <p className="text-muted-foreground mb-4">
                Start logging your daily data to see analytics and predictions.
              </p>
              <Button asChild>
                <a href="/tracking">Start Tracking</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  )
}
