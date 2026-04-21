'use client'

import { AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface ConsentScope {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

interface ConsentPartnerProps {
  partnerId: string
  partnerName: string
  partnerEmail: string
  scopes: ConsentScope[]
  selectedScopes: string[]
  expiresAt?: Date
  isLoading?: boolean
  onScopeToggle: (scopeId: string, selected: boolean) => void
  onSave: () => void
  onRevoke: () => void
}

export function ConsentPartnerCard({
  partnerId,
  partnerName,
  partnerEmail,
  scopes,
  selectedScopes,
  expiresAt,
  isLoading = false,
  onScopeToggle,
  onSave,
  onRevoke,
}: ConsentPartnerProps) {
  const hasChanges = selectedScopes.length > 0

  const expirationDays = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{partnerName}</CardTitle>
            <p className="text-sm text-muted-foreground">{partnerEmail}</p>
          </div>
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Consent Status */}
        {expiresAt && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-300">
              Active until {expiresAt.toLocaleDateString()}
              {expirationDays && expirationDays <= 7 && ` (${expirationDays} days left)`}
            </span>
          </div>
        )}

        {/* Scope Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">What data can {partnerName.split(' ')[0]} see?</p>

          {scopes.map((scope) => (
            <div key={scope.id} className="flex items-start gap-3">
              <Checkbox
                id={`consent-${partnerId}-${scope.id}`}
                checked={selectedScopes.includes(scope.id)}
                onCheckedChange={(checked) => onScopeToggle(scope.id, checked === true)}
                disabled={isLoading}
                aria-label={`${scope.label}: ${scope.description}`}
              />
              <div className="flex-1">
                <Label
                  htmlFor={`consent-${partnerId}-${scope.id}`}
                  className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                >
                  {scope.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{scope.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* No scopes selected warning */}
        {!hasChanges && expiresAt && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-amber-800 dark:text-amber-300">
              Deselecting all options will revoke all access
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            onClick={onSave}
            disabled={isLoading}
            size="sm"
            className="flex-1"
            aria-label={`Save consent settings for ${partnerName}`}
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Consent'
            )}
          </Button>
          <Button
            onClick={onRevoke}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex-1"
            aria-label={`Revoke access for ${partnerName}`}
          >
            {isLoading ? 'Processing...' : 'Revoke Access'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
