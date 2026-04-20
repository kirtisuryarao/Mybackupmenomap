/**
 * Accessibility utilities for improved ARIA labels, focus management, and semantic HTML
 */

/**
 * Generate readable status message for screen readers
 */
export function getStatusMessage(
  status: 'loading' | 'success' | 'error' | 'idle',
  context?: string,
): string {
  const messages: Record<string, string> = {
    loading: `Loading${context ? ` ${context}` : ''}...`,
    success: `Successfully${context ? ` ${context}` : ''}.`,
    error: `Error${context ? ` ${context}` : ''}. Please try again.`,
    idle: context || 'Ready',
  }

  return messages[status] || messages.idle
}

/**
 * Screen reader only text class
 * Hides content visually but keeps it readable for screen readers
 */
export const srOnlyClass = 'sr-only'

/**
 * Generate ARIA label for interactive elements
 */
export function getAriaLabel(action: string, target: string, extra?: string): string {
  const parts = [action, target]
  if (extra) parts.push(extra)
  return parts.join(' ')
}

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const focusableSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])',
  ]

  return focusableSelectors.some((selector) => {
    return element.matches(selector) && !element.hasAttribute('disabled')
  })
}

/**
 * Announce content changes to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    announcement.remove()
  }, 1000)
}

/**
 * High contrast CSS utilities
 */
export const highContrastStyles = {
  // Increase text contrast
  textContrast: {
    color: 'rgb(0, 0, 0)',
    backgroundColor: 'rgb(255, 255, 255)',
    borderColor: 'rgb(0, 0, 0)',
  },
  // Stronger borders
  strongBorder: {
    borderWidth: '2px',
  },
  // Enhanced focus states
  focusVisible: {
    outline: '3px solid rgb(0, 0, 0)',
    outlineOffset: '2px',
  },
}

/**
 * Generate accessible color pair for contrast
 */
export function getAccessibleColor(lightColor: string, darkColor: string, isDark: boolean): string {
  return isDark ? darkColor : lightColor
}

/**
 * Accessible form field helper
 */
export function getFormFieldProps(
  name: string,
  label: string,
  options?: {
    required?: boolean
    error?: string
    helpText?: string
  },
) {
  const id = `field-${name}`
  const ariaDescribedBy: string[] = []

  if (options?.helpText) ariaDescribedBy.push(`${id}-help`)
  if (options?.error) ariaDescribedBy.push(`${id}-error`)

  return {
    id,
    'aria-label': label,
    'aria-describedby': ariaDescribedBy.length > 0 ? ariaDescribedBy.join(' ') : undefined,
    'aria-invalid': !!options?.error,
    'aria-required': !!options?.required,
  }
}

/**
 * Keyboard event helpers
 */
export const keyboardEvents = {
  isEnter: (event: React.KeyboardEvent) => event.key === 'Enter',
  isSpace: (event: React.KeyboardEvent) => event.key === ' ',
  isEscape: (event: React.KeyboardEvent) => event.key === 'Escape',
  isArrowUp: (event: React.KeyboardEvent) => event.key === 'ArrowUp',
  isArrowDown: (event: React.KeyboardEvent) => event.key === 'ArrowDown',
  isTab: (event: React.KeyboardEvent) => event.key === 'Tab',
}

/**
 * Heading level constraint
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export function getHeadingComponent(level: HeadingLevel): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
  return `h${level}` as const
}
