'use client'

import { AlertCircle, TrendingUp } from 'lucide-react'
import { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardSectionProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  action?: ReactNode
  className?: string
}

/**
 * Dashboard section wrapper with consistent styling and accessibility
 */
export function DashboardSection({
  title,
  description,
  icon,
  children,
  isLoading = false,
  isError = false,
  errorMessage,
  action,
  className = '',
}: DashboardSectionProps) {
  return (
    <Card className={`transition-all ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {icon && <span className="text-primary">{icon}</span>}
              <CardTitle>{title}</CardTitle>
            </div>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </CardHeader>

      <CardContent>
        {isError ? (
          <div
            className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex gap-3"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">{errorMessage || 'Failed to load this section'}</div>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Dashboard stat card for displaying key metrics
 */
export function DashboardStatCard({
  label,
  value,
  unit,
  trend,
  icon,
}: {
  label: string
  value: string | number
  unit?: string
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string }
  icon?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : trend.direction === 'down' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
          <TrendingUp className="h-3 w-3" />
          {trend.value}
        </div>
      )}
    </div>
  )
}

/**
 * Dashboard grid layout for organizing sections
 */
export function DashboardGrid({
  children,
  columns = 'auto',
}: {
  children: ReactNode
  columns?: 'auto' | 1 | 2 | 3 | 4
}) {
  const gridClass =
    columns === 'auto'
      ? 'grid gap-4 lg:grid-cols-3 md:grid-cols-2'
      : `grid gap-4 grid-cols-${columns} md:grid-cols-${Math.min(columns, 2)}`

  return <div className={gridClass}>{children}</div>
}

/**
 * Dashboard panels for quick actions
 */
export function DashboardActionPanel({
  title,
  items,
  maxItems = 4,
}: {
  title: string
  items: Array<{ id: string; label: string; icon: ReactNode; action: () => void; badge?: string }>
  maxItems?: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.slice(0, maxItems).map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full flex items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
              aria-label={item.label}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-primary group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.badge && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{item.badge}</span>}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
