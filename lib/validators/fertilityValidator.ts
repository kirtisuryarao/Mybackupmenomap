import { z } from 'zod'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const cervicalMucusValues = ['dry', 'sticky', 'creamy', 'watery', 'egg_white'] as const
const symptomCategories = ['cramps', 'mood', 'digestion', 'skin', 'energy'] as const

function toDayStart(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function isFutureDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() > today.getTime()
}

export const dateSchema = z
  .string()
  .regex(isoDatePattern, 'Date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(toDayStart(value).getTime()), 'Invalid date')
  .refine((value) => !isFutureDate(toDayStart(value)), 'Date cannot be in the future')

export const fertilityLogSchema = z.object({
  date: dateSchema,
  basalTemp: z
    .number()
    .min(35, 'Basal temperature must be at least 35°C')
    .max(40, 'Basal temperature must be at most 40°C')
    .optional(),
  cervicalMucus: z.enum(cervicalMucusValues).optional(),
  ovulationTest: z.boolean().optional(),
  intercourse: z.boolean().optional(),
})

export const symptomLogSchema = z.object({
  date: dateSchema,
  category: z.enum(symptomCategories),
  symptoms: z.array(z.string().min(1).max(50)).min(1).max(15),
  severity: z.number().int().min(1).max(5),
  mood: z.string().min(1).max(50).optional(),
  notes: z.string().max(2000).optional(),
})

export const insightsQuerySchema = z.object({
  referenceDate: dateSchema.optional(),
})
