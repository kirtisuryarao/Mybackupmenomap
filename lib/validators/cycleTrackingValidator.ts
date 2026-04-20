import { z } from 'zod'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function toDayStart(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function isFutureDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() > today.getTime()
}

export const cycleDateSchema = z
  .string()
  .regex(isoDatePattern, 'Date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(toDayStart(value).getTime()), 'Invalid date')
  .refine((value) => !isFutureDate(toDayStart(value)), 'Date cannot be in the future')

export const periodStartSchema = z.object({
  date: cycleDateSchema,
})

export const periodEndSchema = z.object({
  date: cycleDateSchema,
})

export const predictionQuerySchema = z.object({
  referenceDate: cycleDateSchema.optional(),
})
