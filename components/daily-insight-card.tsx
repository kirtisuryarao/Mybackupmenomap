'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhaseBadge } from './phase-badge'
import { useCycleData } from '@/hooks/use-cycle-data'
import { Heart, Lightbulb, TrendingUp } from 'lucide-react'

const phaseInsights = {
  period: {
    mood: 'Energy may be lower. Focus on rest and self-care.',
    selfCare: 'Consider gentle exercise, warm foods, and extra sleep.',
    energy: 'Low - Give yourself permission to slow down',
  },
  follicular: {
    mood: 'Mood improves, confidence rises, social energy increases.',
    selfCare: 'Great time for new projects and social activities.',
    energy: 'Rising - Channel this for big initiatives',
  },
  ovulation: {
    mood: 'Peak confidence, openness, and communication skills.',
    selfCare: 'Great for important meetings and social plans.',
    energy: 'Peak - Maximum energy and sociability',
  },
  luteal: {
    mood: 'Sensitivity heightens, introspection increases.',
    selfCare: 'Honor your need for quiet time and reflection.',
    energy: 'Declining - Conserve energy, reduce commitments',
  },
}

export function DailyInsightCard() {
  const { todayInfo, isLoading } = useCycleData()

  if (isLoading || !todayInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading daily insights...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const insight = phaseInsights[todayInfo.phase]

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Today's Cycle</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Day {todayInfo.dayOfCycle} of your cycle
            </p>
          </div>
          <PhaseBadge phase={todayInfo.phase} dayNumber={todayInfo.dayOfCycle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Mood & Emotions</h3>
            </div>
            <p className="text-sm text-muted-foreground">{insight.mood}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Self-Care Tip</h3>
            </div>
            <p className="text-sm text-muted-foreground">{insight.selfCare}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Energy Level</h3>
            </div>
            <p className="text-sm text-muted-foreground">{insight.energy}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
