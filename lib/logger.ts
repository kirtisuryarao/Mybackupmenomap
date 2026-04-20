import pino from 'pino'

export type LogStatus = 'success' | 'failure' | 'info'

export interface SafeLogEvent {
  userId?: string
  event: string
  status: LogStatus
  metadata?: Record<string, unknown>
}

const baseLogger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.authorization',
      '*.email',
      '*.notes',
      '*.symptoms',
      '*.mood',
      '*.temperature',
    ],
    remove: true,
  },
})

function sanitizeEvent(payload: SafeLogEvent) {
  return {
    userId: payload.userId ?? 'anonymous',
    event: payload.event,
    status: payload.status,
    metadata: payload.metadata,
  }
}

export const logger = {
  event(payload: SafeLogEvent) {
    baseLogger.info(sanitizeEvent(payload))
  },
  error(payload: SafeLogEvent, error?: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    baseLogger.error({ ...sanitizeEvent(payload), error: errorMessage })
  },
}
