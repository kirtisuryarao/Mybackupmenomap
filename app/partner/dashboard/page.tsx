'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, LogOut, Calendar, TrendingUp, AlertCircle } from 'lucide-react'

interface PartnerData {
  partner: {
    id: string
    name: string
  }
  linkedUser: {
    id: string
    name: string
    email: string
    cycleLength: number
  }
  cycleData: {
    lastPeriodDate: string | null
    cycleLength: number
  }
  prediction: {
    predictedPeriodDate: string
    ovulationDate: string
    fertileWindowStart: string
    fertileWindowEnd: string
    confidence: number
  } | null
  recentLogs: any[]
}

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPartnerData = async () => {
      try {
        const token = localStorage.getItem('partnerAccessToken')
        if (!token) {
          window.location.href = '/partner/login'
          return
        }

        const response = await fetch('/api/partner/data', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('partnerAccessToken')
            localStorage.removeItem('partnerRefreshToken')
            localStorage.removeItem('partnerId')
            window.location.href = '/partner/login'
          }
          throw new Error('Failed to fetch data')
        }

        const data = await response.json()
        setPartner(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchPartnerData()
  }, [])

  const handleLogout = () => {
    const refreshToken = localStorage.getItem('partnerRefreshToken')
    fetch('/api/partner/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // Best effort logout API call.
    })

    localStorage.removeItem('partnerAccessToken')
    localStorage.removeItem('partnerRefreshToken')
    localStorage.removeItem('partnerId')
    localStorage.removeItem('partnerData')
    window.location.href = '/partner/login'
  }

  const switchToUserMode = () => {
    window.location.href = '/auth/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-pulse mb-4">
            <Heart className="h-12 w-12 text-blue-500" />
          </div>
          <p className="text-slate-600 text-lg">Loading partner data...</p>
        </div>
      </div>
    )
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <p className="font-semibold">{error || 'Unable to load dashboard'}</p>
            </div>
            <Button onClick={() => (window.location.href = '/partner/login')} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const calculateCycleDay = () => {
    if (!partner.cycleData.lastPeriodDate) return null
    const lastPeriod = new Date(partner.cycleData.lastPeriodDate)
    const today = new Date()
    const diffTime = today.getTime() - lastPeriod.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > partner.cycleData.cycleLength ? null : diffDays
  }

  const getCyclePhase = (day: number | null) => {
    if (!day) return null
    const cycleLength = partner.cycleData.cycleLength
    if (day <= 5) return { name: 'Menstruation', color: 'bg-red-100 text-red-700' }
    if (day <= 12) return { name: 'Follicular', color: 'bg-yellow-100 text-yellow-700' }
    if (day <= 14) return { name: 'Ovulation', color: 'bg-blue-100 text-blue-700' }
    return { name: 'Luteal', color: 'bg-purple-100 text-purple-700' }
  }

  const cycleDay = calculateCycleDay()
  const phase = cycleDay ? getCyclePhase(cycleDay) : null

  const daysUntilNextPeriod = partner.prediction
    ? Math.ceil((new Date(partner.prediction.predictedPeriodDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-2">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Partner Dashboard</h1>
              <p className="text-sm text-slate-600">Viewing {partner.linkedUser.name}'s cycle</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" className="text-slate-700 hover:text-slate-900">
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>

        {/* Partner Mode Banner */}
        <div className="bg-blue-50 border-t-2 border-blue-200 px-4 py-3">
          <p className="text-center text-sm font-medium text-blue-800">
            💙 You have read-only access to {partner.linkedUser.name}'s cycle information
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
          <CardContent className="pt-6">
            <p className="text-center text-slate-700">
              <span className="font-semibold text-lg">💚 Support & Understanding</span>
              <br />
              <span className="text-sm">
                Understanding {partner.linkedUser.name}'s cycle helps you provide better support during different phases.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Cycle Status */}
        {partner.cycleData.lastPeriodDate ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Current Cycle Phase */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Current Cycle Phase
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {cycleDay ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Day {cycleDay} of {partner.cycleData.cycleLength}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(cycleDay / partner.cycleData.cycleLength) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    {phase && (
                      <div className={`p-3 rounded-lg ${phase.color}`}>
                        <p className="font-semibold">{phase.name}</p>
                        <p className="text-sm mt-1">
                          {phase.name === 'Menstruation' && '🩸 Period is ongoing. Be extra supportive during this time.'}
                          {phase.name === 'Follicular' && '🌱 Energy levels are rising. Great time for new activities together.'}
                          {phase.name === 'Ovulation' && '✨ Peak energy phase. This is a great time for quality time!'}
                          {phase.name === 'Luteal' && '🌙 Energy may be lower. Offer support and understanding.'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-600">No active cycle data. Check back after logging starts.</p>
                )}
              </CardContent>
            </Card>

            {/* Next Period Prediction */}
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Next Period Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {partner.prediction ? (
                  <div className="space-y-4">
                    {daysUntilNextPeriod !== null && (
                      <>
                        <div>
                          <p className="text-sm text-slate-600 mb-2">Days until next period</p>
                          <p className="text-3xl font-bold text-green-600">{Math.max(0, daysUntilNextPeriod)}</p>
                        </div>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <span className="font-semibold">Predicted Date:</span>
                            <br />
                            {new Date(partner.prediction.predictedPeriodDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-semibold">Ovulation:</span>
                            <br />
                            {new Date(partner.prediction.ovulationDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-600">No predictions available yet. Check back after more cycle data is logged.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mb-8 border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-center text-slate-700">
                <span className="font-semibold">⏳ No cycle data yet</span>
                <br />
                <span className="text-sm">
                  Ask {partner.linkedUser.name} to start logging their period so you can access cycle insights.
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {partner.recentLogs.length > 0 && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
              <CardTitle className="text-slate-900">Recent Activity (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {partner.recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-slate-600">
                        {log.mood?.length > 0 && `Mood: ${log.mood.join(', ')} • `}
                        {log.symptoms?.length > 0 && `Symptoms: ${log.symptoms.slice(0, 2).join(', ')}`}
                      </p>
                    </div>
                    {log.flow && (
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          log.flow === 'heavy' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {log.flow}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-blue-100 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">🔒 Privacy Protected:</span> Only you and your partner can access this data
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-100 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">📖 Read-Only Access:</span> You can view but not edit any data
              </p>
            </CardContent>
          </Card>
          <Card className="border-2 border-purple-100 bg-purple-50">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">💚 Be Supportive:</span> Use this insight to be a better partner
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={switchToUserMode} variant="outline" className="border-blue-200 text-blue-700">
            Switch to User Mode
          </Button>
        </div>
      </main>
    </div>
  )
}
