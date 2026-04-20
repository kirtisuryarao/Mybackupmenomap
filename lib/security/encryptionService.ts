import crypto from 'crypto'

/**
 * Encryption service for sensitive health data stored in the database.
 * Uses AES-256-GCM for authenticated encryption with automatic key derivation.
 *
 * Sensitive fields encrypted:
 * - DailyLog: notes, mood, symptoms, flow, spotting, sleepQuality
 * - SymptomLog: notes, symptoms, mood
 * - FertilityLog: basalTemp, cervicalMucus, ovulationTest, intercourse
 * - Medication: notes
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 16
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

interface EncryptedData {
  encrypted: string
  iv: string
  salt: string
  tag: string
}

/**
 * Derives a encryption key from a master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Gets the master encryption key from environment variables
 * Should be a secure key stored in secrets management system
 */
function getMasterKey(): string {
  const key = process.env.DATABASE_ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'DATABASE_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    )
  }
  if (key.length < 32) {
    throw new Error('DATABASE_ENCRYPTION_KEY must be at least 32 characters (16 bytes hex)')
  }
  return key
}

/**
 * Encrypts a string value using AES-256-GCM
 * Returns a JSON object with encrypted data, IV, salt, and authentication tag
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return null
  }

  try {
    const masterKey = getMasterKey()
    const salt = crypto.randomBytes(SALT_LENGTH)
    const iv = crypto.randomBytes(IV_LENGTH)

    const key = deriveKey(masterKey, salt)

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()

    const encryptedData: EncryptedData = {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex'),
    }

    // Store as base64 to ensure it's safely stored as text in database
    return Buffer.from(JSON.stringify(encryptedData)).toString('base64')
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error(`Failed to encrypt field: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decrypts a field that was encrypted with encryptField
 * Returns null if decryption fails or input is null/empty
 */
export function decryptField(encryptedBase64: string | null | undefined): string | null {
  if (!encryptedBase64) {
    return null
  }

  try {
    const masterKey = getMasterKey()

    // Decode from base64
    const encryptedDataStr = Buffer.from(encryptedBase64, 'base64').toString('utf8')
    const encryptedData = JSON.parse(encryptedDataStr) as EncryptedData

    const salt = Buffer.from(encryptedData.salt, 'hex')
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const tag = Buffer.from(encryptedData.tag, 'hex')

    const key = deriveKey(masterKey, salt)

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error(`Failed to decrypt field: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Encrypts an array of strings (used for mood, symptoms arrays)
 * Returns null if input is null/empty
 */
export function encryptArray(items: string[] | null | undefined): string | null {
  if (!items || items.length === 0) {
    return null
  }
  return encryptField(JSON.stringify(items))
}

/**
 * Decrypts an array that was encrypted with encryptArray
 * Returns empty array if decryption fails or input is null
 */
export function decryptArray(encryptedBase64: string | null | undefined): string[] {
  if (!encryptedBase64) {
    return []
  }

  try {
    const decrypted = decryptField(encryptedBase64)
    if (!decrypted) return []
    return JSON.parse(decrypted) as string[]
  } catch (error) {
    console.error('Array decryption failed:', error)
    return []
  }
}

/**
 * Encrypts a boolean value
 * Returns null if input is null/undefined
 */
export function encryptBoolean(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return encryptField(value.toString())
}

/**
 * Decrypts a boolean value
 * Returns null if input is null/empty
 */
export function decryptBoolean(encryptedBase64: string | null | undefined): boolean | null {
  if (!encryptedBase64) {
    return null
  }

  try {
    const decrypted = decryptField(encryptedBase64)
    if (!decrypted) return null
    return decrypted === 'true'
  } catch (error) {
    console.error('Boolean decryption failed:', error)
    return null
  }
}

/**
 * Encrypts a numeric value
 * Returns null if input is null/undefined
 */
export function encryptNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return encryptField(value.toString())
}

/**
 * Decrypts a numeric value
 * Returns null if input is null/empty
 */
export function decryptNumber(encryptedBase64: string | null | undefined): number | null {
  if (!encryptedBase64) {
    return null
  }

  try {
    const decrypted = decryptField(encryptedBase64)
    if (!decrypted) return null
    const num = parseFloat(decrypted)
    return isNaN(num) ? null : num
  } catch (error) {
    console.error('Number decryption failed:', error)
    return null
  }
}
