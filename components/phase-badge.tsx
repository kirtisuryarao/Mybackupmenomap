import { Badge } from '@/components/ui/badge'

export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal'

interface PhaseBadgeProps {
  phase: CyclePhase
  dayNumber?: number
}

const phaseColors: Record<CyclePhase, { bg: string; text: string; label: string }> = {
  period: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Menstruation',
  },
  follicular: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    label: 'Follicular',
  },
  ovulation: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    label: 'Ovulation',
  },
  luteal: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: 'Luteal/PMS',
  },
}

export function PhaseBadge({ phase, dayNumber }: PhaseBadgeProps) {
  const { bg, text, label } = phaseColors[phase]

  return (
    <Badge className={`${bg} ${text} hover:opacity-80`}>
      {label}
      {dayNumber !== undefined && ` (Day ${dayNumber})`}
    </Badge>
  )
}
