'use client'

import { AlertTriangle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export function HealthAlertCard({ message }: { message: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50 shadow-[0_10px_30px_rgba(245,158,11,0.12)]">
      <CardContent className="flex items-start gap-3 p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900">Early warning alert</p>
          <p className="text-sm text-amber-800">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}