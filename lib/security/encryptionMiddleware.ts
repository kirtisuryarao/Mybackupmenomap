import {
  encryptField,
  decryptField,
  encryptArray,
  decryptArray,
  encryptBoolean,
  decryptBoolean,
  encryptNumber,
  decryptNumber,
} from './encryptionService'

/**
 * Prisma middleware for automatic field-level encryption/decryption
 * Encrypts sensitive health data before storing to database
 * Decrypts data when reading from database
 */

interface MiddlewareParams {
  action: string
  model: string
  args: any
}

export function createEncryptionMiddleware() {
  return async (params: MiddlewareParams, next: (params: MiddlewareParams) => Promise<any>) => {
    const { action, model, args } = params

    // Encrypt before write operations
    if (['create', 'createMany', 'update', 'updateMany', 'upsert'].includes(action)) {
      if (model === 'DailyLog' && args.data) {
        const data = Array.isArray(args.data) ? args.data : [args.data]
        data.forEach((item: any) => {
          if (item.notes !== undefined) item.notes = encryptField(item.notes)
          if (item.mood !== undefined) item.mood = encryptArray(item.mood)
          if (item.symptoms !== undefined) item.symptoms = encryptArray(item.symptoms)
          if (item.flow !== undefined) item.flow = encryptField(item.flow)
          if (item.spotting !== undefined) item.spotting = encryptField(item.spotting)
          if (item.sleepQuality !== undefined) item.sleepQuality = encryptField(item.sleepQuality)
        })
      }

      if (model === 'SymptomLog' && args.data) {
        const data = Array.isArray(args.data) ? args.data : [args.data]
        data.forEach((item: any) => {
          if (item.notes !== undefined) item.notes = encryptField(item.notes)
          if (item.symptoms !== undefined) item.symptoms = encryptArray(item.symptoms)
          if (item.mood !== undefined) item.mood = encryptField(item.mood)
        })
      }

      if (model === 'FertilityLog' && args.data) {
        const data = Array.isArray(args.data) ? args.data : [args.data]
        data.forEach((item: any) => {
          if (item.basalTemp !== undefined) item.basalTemp = encryptNumber(item.basalTemp)
          if (item.cervicalMucus !== undefined) item.cervicalMucus = encryptField(item.cervicalMucus)
          if (item.ovulationTest !== undefined) item.ovulationTest = encryptBoolean(item.ovulationTest)
          if (item.intercourse !== undefined) item.intercourse = encryptBoolean(item.intercourse)
        })
      }

      if (model === 'Medication' && args.data) {
        const data = Array.isArray(args.data) ? args.data : [args.data]
        data.forEach((item: any) => {
          if (item.notes !== undefined) item.notes = encryptField(item.notes)
        })
      }
    }

    // Execute the query
    const result = await next(params)

    // Decrypt after read operations
    if (['findUnique', 'findFirst', 'findMany', 'findRaw'].includes(action)) {
      if (model === 'DailyLog') {
        if (Array.isArray(result)) {
          result.forEach((item: any) => {
            if (item.notes) item.notes = decryptField(item.notes)
            if (item.mood) item.mood = decryptArray(item.mood)
            if (item.symptoms) item.symptoms = decryptArray(item.symptoms)
            if (item.flow) item.flow = decryptField(item.flow)
            if (item.spotting) item.spotting = decryptField(item.spotting)
            if (item.sleepQuality) item.sleepQuality = decryptField(item.sleepQuality)
          })
        } else if (result) {
          if (result.notes) result.notes = decryptField(result.notes)
          if (result.mood) result.mood = decryptArray(result.mood)
          if (result.symptoms) result.symptoms = decryptArray(result.symptoms)
          if (result.flow) result.flow = decryptField(result.flow)
          if (result.spotting) result.spotting = decryptField(result.spotting)
          if (result.sleepQuality) result.sleepQuality = decryptField(result.sleepQuality)
        }
      }

      if (model === 'SymptomLog') {
        if (Array.isArray(result)) {
          result.forEach((item: any) => {
            if (item.notes) item.notes = decryptField(item.notes)
            if (item.symptoms) item.symptoms = decryptArray(item.symptoms)
            if (item.mood) item.mood = decryptField(item.mood)
          })
        } else if (result) {
          if (result.notes) result.notes = decryptField(result.notes)
          if (result.symptoms) result.symptoms = decryptArray(result.symptoms)
          if (result.mood) result.mood = decryptField(result.mood)
        }
      }

      if (model === 'FertilityLog') {
        if (Array.isArray(result)) {
          result.forEach((item: any) => {
            if (item.basalTemp) item.basalTemp = decryptNumber(item.basalTemp)
            if (item.cervicalMucus) item.cervicalMucus = decryptField(item.cervicalMucus)
            if (item.ovulationTest) item.ovulationTest = decryptBoolean(item.ovulationTest)
            if (item.intercourse) item.intercourse = decryptBoolean(item.intercourse)
          })
        } else if (result) {
          if (result.basalTemp) result.basalTemp = decryptNumber(result.basalTemp)
          if (result.cervicalMucus) result.cervicalMucus = decryptField(result.cervicalMucus)
          if (result.ovulationTest) result.ovulationTest = decryptBoolean(result.ovulationTest)
          if (result.intercourse) result.intercourse = decryptBoolean(result.intercourse)
        }
      }

      if (model === 'Medication') {
        if (Array.isArray(result)) {
          result.forEach((item: any) => {
            if (item.notes) item.notes = decryptField(item.notes)
          })
        } else if (result) {
          if (result.notes) result.notes = decryptField(result.notes)
        }
      }
    }

    return result
  }
}
