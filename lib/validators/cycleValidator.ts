import { z } from 'zod'

export const cycleValidator = z.object({
  cycleLength: z.number().int().min(20).max(45),
  periodDuration: z.number().int().min(2).max(10),
})

export type CycleValidatorInput = z.infer<typeof cycleValidator>
