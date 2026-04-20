import { z } from 'zod'

export const relationshipTypeSchema = z.enum([
  'partner',
  'spouse',
  'boyfriend',
  'girlfriend',
  'fiance',
  'other',
])

export const partnerBaseSchema = z.object({
  name: z.string().trim().min(1, 'Partner name is required').max(100, 'Name is too long'),
  relationshipType: relationshipTypeSchema.optional(),
})

export const createPartnerSchema = partnerBaseSchema.extend({
  email: z.string().trim().email('Valid email is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>
