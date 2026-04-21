'use client'

import { format } from 'date-fns'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { authenticatedFetch } from '@/lib/auth-client'

interface TrackModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  onSuccess: () => void
}

const MOOD_OPTIONS = ['Happy', 'Sad', 'Anxious', 'Irritable', 'Calm', 'Energetic']
const SYMPTOM_OPTIONS = ['Cramps', 'Hot flashes', 'Night sweats', 'Headache', 'Fatigue', 'Bloating', 'Tender Breasts', 'Acne']
const FLOW_OPTIONS = [
  { value: 'light', label: '🔴 Light' },
  { value: 'medium', label: '🔴🔴 Medium' },
  { value: 'heavy', label: '🔴🔴🔴 Heavy' },
  { value: 'super_heavy', label: '🔴🔴🔴🔴 Super Heavy' },
]

export function TrackModal({ isOpen, onClose, selectedDate, onSuccess }: TrackModalProps) {
  const [isPeriodStart, setIsPeriodStart] = useState(false)
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [flow, setFlow] = useState<string>('')
  const [sleepHours, setSleepHours] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!selectedDate) return null

  const handleMoodToggle = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    )
  }

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    )
  }

  const handlePeriodStartChange = (checked: boolean) => {
    setIsPeriodStart(checked)
    if (checked && !flow) {
      setFlow('light')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setIsLoading(true)

    try {
      const payload = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        isPeriodStart,
        mood: selectedMoods,
        symptoms: selectedSymptoms,
        flow: flow || null,
        sleepHours: sleepHours ? parseFloat(sleepHours) : null,
        notes: notes || null,
      }
      
      console.error('[TrackModal] Saving log with payload:', payload)

      const response = await authenticatedFetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const savedLog = await response.json()
        console.error('[TrackModal] Log saved successfully:', {
          hasCycleData: savedLog.cycle?.hasCycleData,
          lastPeriodDate: savedLog.cycle?.lastPeriodDate,
          flow: savedLog.flow,
          isPeriodStart: payload.isPeriodStart,
        })

        // Dispatch event to trigger all data refresh
        window.dispatchEvent(new CustomEvent('menomap:logs-updated'))
        
        // Small delay to ensure listeners are triggered
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 100)
      } else {
        const errorData = await response.json()
        console.error('[TrackModal] Save failed:', errorData)
        setError(errorData.error || 'Failed to save tracking data')
      }
    } catch (error) {
      console.error('[TrackModal] Exception during save:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsPeriodStart(false)
    setSelectedMoods([])
    setSelectedSymptoms([])
    setFlow('')
    setSleepHours('')
    setNotes('')
    setError('')
    onClose()
  }

  const dateStr = format(selectedDate, 'EEEE, MMMM d, yyyy')

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[82vh] overflow-y-auto rounded-2xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-base">Track - {dateStr}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Period Start Section */}
          <Card className="border-pink-200 bg-pink-50">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                  P
                </span>
                Period Start
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="period-start"
                  checked={isPeriodStart}
                  onCheckedChange={(checked) => handlePeriodStartChange(checked as boolean)}
                  className="w-5 h-5 cursor-pointer"
                />
                <Label htmlFor="period-start" className="text-sm font-medium cursor-pointer flex-1">
                  Did your period start today? (Marks as Day 1 of cycle)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Flow Section */}
          {isPeriodStart && (
            <Card className="border-red-200">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Period Flow</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <Select value={flow} onValueChange={setFlow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flow intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOW_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Mood Section */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">Mood</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 pb-3">
              <p className="text-sm text-muted-foreground">How are you feeling today?</p>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <Badge
                    key={mood}
                    variant={selectedMoods.includes(mood) ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      selectedMoods.includes(mood)
                        ? 'bg-pink-500 hover:bg-pink-600'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleMoodToggle(mood)}
                  >
                    {mood}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Symptoms Section */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">Symptoms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 pb-3">
              <p className="text-sm text-muted-foreground">What symptoms are you experiencing?</p>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((symptom) => (
                  <Badge
                    key={symptom}
                    variant={selectedSymptoms.includes(symptom) ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      selectedSymptoms.includes(symptom)
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleSymptomToggle(symptom)}
                  >
                    {symptom}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">Sleep Hours</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <Input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={sleepHours}
                onChange={(event) => setSleepHours(event.target.value)}
                placeholder="7.5"
              />
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20"
              />
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tracking'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
