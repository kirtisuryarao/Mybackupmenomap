'use client'

import { AlertCircle, Droplet, Brain, Zap, Apple } from 'lucide-react'
import { useState } from 'react'

import { LayoutWrapper } from '@/components/layout-wrapper'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCycleData } from '@/hooks/use-cycle-data'

const insightsByPhase = {
  period: {
    hygiene: {
      title: 'Menstrual Hygiene Tips',
      tips: [
        'Change pads/tampons every 4-8 hours',
        'Use period products that work best for you (pads, tampons, cups, or discs)',
        'Shower regularly, but avoid douching',
        'Wear breathable, cotton underwear',
        'Keep track of flow to detect abnormalities',
        'Use a heating pad for comfort',
      ],
    },
    mood: {
      title: 'Emotional Support',
      tips: [
        'Mood swings are normal due to hormone changes',
        'Practice self-compassion',
        'Talk to loved ones about what you need',
        'Consider journaling your feelings',
        'Avoid major stressful decisions if possible',
        'Remember: this phase is temporary',
      ],
    },
    yoga: {
      title: 'Gentle Movement',
      tips: [
        'Focus on restorative yoga',
        'Try gentle stretching and yin yoga',
        'Walking and swimming are excellent choices',
        'Avoid intense cardio if uncomfortable',
        'Listen to your body - rest is okay',
        'Child\'s pose and legs-up-the-wall are beneficial',
      ],
    },
    nutrition: {
      title: 'Nutritional Support',
      tips: [
        'Increase iron-rich foods (spinach, beans, red meat)',
        'Stay hydrated - increase water intake',
        'Eat foods rich in magnesium (dark chocolate, nuts)',
        'Include omega-3 fatty acids (fish, flax)',
        'Reduce caffeine and sugar if they worsen symptoms',
        'Eat regular, balanced meals to maintain energy',
      ],
    },
  },
  follicular: {
    hygiene: {
      title: 'Follicular Phase Care',
      tips: [
        'Skin may be clearer - maintain your routine',
        'Take advantage of clearer skin for dermatology treatments',
        'Light periods of bleeding are normal',
        'Continue regular hygiene practices',
        'Your immune system is stronger now',
        'Good time for physical activities',
      ],
    },
    mood: {
      title: 'Peak Positivity',
      tips: [
        'Mood is typically at its best',
        'Energy and motivation are high',
        'Great time for social activities',
        'Channel this energy for challenges',
        'Confidence is boosted',
        'Take on new projects and goals',
      ],
    },
    yoga: {
      title: 'Dynamic Movement',
      tips: [
        'High energy means great for intense workouts',
        'Try power yoga or vinyasa flow',
        'Running and HIIT workouts feel good',
        'Take advantage of peak strength',
        'Group fitness classes are especially fun',
        'This is your peak athletic phase',
      ],
    },
    nutrition: {
      title: 'Fuel Your Energy',
      tips: [
        'Eat regular, balanced meals',
        'Increase carbohydrates for energy',
        'Protein intake supports muscle building',
        'Eat when hungry - metabolism is increased',
        'Continue hydration habits',
        'Light meals are easier to digest',
      ],
    },
  },
  ovulation: {
    hygiene: {
      title: 'Ovulation Care',
      tips: [
        'This is your most fertile window',
        'Cervical fluid increases - this is normal',
        'Maintain regular hygiene practices',
        'Skin may be at its clearest and most radiant',
        'Peak immune function occurs now',
        'Good time for medical appointments',
      ],
    },
    mood: {
      title: 'Peak Confidence',
      tips: [
        'Maximum confidence and social skills',
        'Peak attractiveness (natural pheromones peak)',
        'Excellent time for presentations and negotiations',
        'Communication skills are at their best',
        'Sleep may be slightly disrupted',
        'Increased libido is normal',
      ],
    },
    yoga: {
      title: 'Peak Performance',
      tips: [
        'Peak physical strength and endurance',
        'Perfect time for PR attempts',
        'High-intensity workouts feel amazing',
        'Joint flexibility is at its best',
        'Energy levels are peak',
        'This is your strongest athletic window',
      ],
    },
    nutrition: {
      title: 'Peak Performance Nutrition',
      tips: [
        'Caloric needs are higher',
        'Eat enough to fuel your energy',
        'Protein is crucial for muscle support',
        'Carbs support intense workouts',
        'Stay well-hydrated',
        'Body temperature is slightly elevated',
      ],
    },
  },
  luteal: {
    hygiene: {
      title: 'Luteal Phase Care',
      tips: [
        'May experience bloating - wear comfortable clothing',
        'Skin may break out - adjust skincare if needed',
        'Acne-prone skin may need extra care',
        'Stay hydrated to reduce water retention',
        'Regular showers help with discomfort',
        'Self-care becomes more important',
      ],
    },
    mood: {
      title: 'PMS & Emotional Awareness',
      tips: [
        'Mood sensitivity increases - this is normal',
        'May experience PMS symptoms (irritability, sadness)',
        'Prioritize self-compassion',
        'Communicate needs to loved ones',
        'Introspection and reflection are beneficial',
        'Boundaries become more important',
      ],
    },
    yoga: {
      title: 'Restorative Movement',
      tips: [
        'Energy naturally decreases',
        'Focus on restorative yoga and stretching',
        'Walking and yoga are ideal',
        'Listen to your body - rest is valid',
        'Gentle, grounding practices help',
        'Avoid intense exercise if overwhelmed',
      ],
    },
    nutrition: {
      title: 'Stabilizing Nutrition',
      tips: [
        'Increase magnesium-rich foods (nuts, seeds)',
        'Calcium-rich foods help with mood',
        'Complex carbs support serotonin',
        'Reduce salt to minimize water retention',
        'Eat smaller, frequent meals',
        'Increase B-vitamins (whole grains, leafy greens)',
      ],
    },
  },
}

export default function InsightsPage() {
  const { todayInfo, isLoading } = useCycleData()
  const [activeTab, setActiveTab] = useState('hygiene')

  if (isLoading || !todayInfo) {
    return (
      <LayoutWrapper>
        <div className="text-center">Loading insights...</div>
      </LayoutWrapper>
    )
  }

  const currentPhaseInsights = insightsByPhase[todayInfo.phase]

  const tabIcons = {
    hygiene: Droplet,
    mood: Brain,
    yoga: Zap,
    nutrition: Apple,
  }

  return (
    <LayoutWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Phase-Based Insights</h1>
          <p className="text-muted-foreground">
            Get personalized health tips for your current phase
          </p>
        </div>

        {/* Current Phase Alert */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-1">
                  You're in your {insightsByPhase[todayInfo.phase].hygiene.title.split(' ')[0]} phase
                </p>
                <p className="text-sm text-muted-foreground">
                  Day {todayInfo.dayOfCycle} of {28} - Customize these tips based on your personal experience
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hygiene" className="gap-2">
              <Droplet className="h-4 w-4" />
              <span className="hidden sm:inline">Hygiene</span>
            </TabsTrigger>
            <TabsTrigger value="mood" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Mood</span>
            </TabsTrigger>
            <TabsTrigger value="yoga" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Movement</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="gap-2">
              <Apple className="h-4 w-4" />
              <span className="hidden sm:inline">Nutrition</span>
            </TabsTrigger>
          </TabsList>

          {(['hygiene', 'mood', 'yoga', 'nutrition'] as const).map((tabKey) => {
            const content = currentPhaseInsights[tabKey]
            const Icon = tabIcons[tabKey]

            return (
              <TabsContent key={tabKey} value={tabKey} className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle>{content.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {content.tips.map((tip, idx) => (
                        <li key={idx} className="flex gap-3">
                          <Badge variant="outline" className="h-fit mt-0.5 flex-shrink-0">
                            {idx + 1}
                          </Badge>
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Educational Note */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Personalize These Insights</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Everyone's cycle is unique. These are general guidelines based on typical hormonal patterns.
              Your experience may differ, and that's completely normal.
            </p>
            <p>
              Use this app to track what works best for you and adjust your routine accordingly.
            </p>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}
