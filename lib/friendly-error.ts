const DEFAULT_FRIENDLY_ERROR = 'Something went wrong. Please try again or contact support if the problem persists.'

const FRIENDLY_ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  // Network errors
  { pattern: /network|fetch|timeout|offline|unable to reach/i, message: 'Connection unstable. Check internet and try again.' },

  // Authentication errors
  { pattern: /unauthori|forbidden|token|auth|session|sign in/i, message: 'Your session expired. Please sign in again.' },

  // Validation errors
  { pattern: /validation|invalid|required|format|malformed/i, message: 'Please check your input and try again.' },
  { pattern: /pin|password|incorrect/i, message: 'That code didn\'t match. Try again.' },
  { pattern: /email.*invalid|not a valid email/i, message: 'Please enter a valid email address.' },

  // Partner & Consent errors
  { pattern: /consent|partner|sharing|access denied/i, message: 'Could not update partner settings. Try again shortly.' },
  { pattern: /partner.*not found/i, message: 'Partner not found. They may have been removed.' },

  // Data operation errors
  { pattern: /export|report|download|storage|limit/i, message: 'Could not process your request. Try again shortly.' },
  { pattern: /database|persistence|save/i, message: 'Could not save changes. Please try again.' },

  // User not found or deleted
  { pattern: /user.*not found|account.*deleted|no such user/i, message: 'Your account could not be found. Please sign in again.' },

  // Server errors
  { pattern: /server|internal|500|502|503|504/i, message: 'Server is busy. Please wait a moment and try again.' },
]

export function toFriendlyErrorMessage(error: unknown, fallback: string = DEFAULT_FRIENDLY_ERROR): string {
  if (error instanceof Error) {
    const normalized = error.message.trim()
    if (!normalized) return fallback

    const match = FRIENDLY_ERROR_MAP.find((item) => item.pattern.test(normalized))
    if (match) {
      return match.message
    }

    // If error message is short enough, return as-is
    if (normalized.length <= 100 && !normalized.includes('TypeError') && !normalized.includes('Object')) {
      return normalized
    }
  }

  return fallback
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return /network|fetch|timeout|offline|unable to reach/i.test(error.message)
  }
  return false
}

/**
 * Checks if an error is an authentication-related error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return /unauthori|forbidden|token|auth|session/i.test(error.message)
  }
  return false
}

/**
 * Checks if an error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    return /validation|invalid|required|format/i.test(error.message)
  }
  return false
}
