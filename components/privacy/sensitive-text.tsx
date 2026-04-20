'use client'

import { ReactNode } from 'react'

import { usePrivacy } from '@/components/privacy/privacy-provider'
import { SensitiveDataType, getHiddenValueLabel, shouldBlurType } from '@/lib/security/privacyService'

interface SensitiveTextProps {
  type: SensitiveDataType
  children: ReactNode
  className?: string
}

export function SensitiveText({ type, children, className }: SensitiveTextProps) {
  const { preferences, locked } = usePrivacy()
  const shouldBlur = locked || shouldBlurType(type, preferences)

  if (!shouldBlur) {
    return <span className={className}>{children}</span>
  }

  if (locked || preferences.hideSensitiveData) {
    return <span className={className}>{getHiddenValueLabel(type)}</span>
  }

  return (
    <span className={`inline-block select-none blur-sm ${className ?? ''}`.trim()} aria-hidden="true">
      {children}
    </span>
  )
}
