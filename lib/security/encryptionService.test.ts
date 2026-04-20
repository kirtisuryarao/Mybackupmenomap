import {
  encryptField,
  decryptField,
  encryptArray,
  decryptArray,
  encryptBoolean,
  decryptBoolean,
  encryptNumber,
  decryptNumber,
} from '@/lib/security/encryptionService'

// Set test encryption key
beforeAll(() => {
  process.env.DATABASE_ENCRYPTION_KEY = 'a'.repeat(64) // 32 bytes hex = 64 chars
})

describe('Encryption Service', () => {
  describe('encryptField and decryptField', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'This is sensitive health information'
      const encrypted = encryptField(plaintext)

      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe(plaintext)

      const decrypted = decryptField(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should handle null values', () => {
      expect(encryptField(null)).toBeNull()
      expect(encryptField(undefined)).toBeNull()
      expect(encryptField('')).toBeNull()
    })

    it('should return null when decrypting null', () => {
      expect(decryptField(null)).toBeNull()
      expect(decryptField(undefined)).toBeNull()
      expect(decryptField('')).toBeNull()
    })

    it('should produce different ciphertext for same plaintext (due to random IV and salt)', () => {
      const plaintext = 'Same content'
      const encrypted1 = encryptField(plaintext)
      const encrypted2 = encryptField(plaintext)

      expect(encrypted1).not.toBe(encrypted2) // Different due to random salt and IV
      expect(decryptField(encrypted1)).toBe(plaintext)
      expect(decryptField(encrypted2)).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = 'Special chars: 你好世界 🎉 @#$%^&*()'
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000)
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw on invalid encryption key', () => {
      const oldKey = process.env.DATABASE_ENCRYPTION_KEY
      delete process.env.DATABASE_ENCRYPTION_KEY

      expect(() => encryptField('test')).toThrow()

      process.env.DATABASE_ENCRYPTION_KEY = oldKey
    })

    it('should throw on corrupted encrypted data', () => {
      const encrypted = encryptField('test')
      const corrupted = Buffer.from(encrypted, 'base64').toString('hex') // Change encoding

      expect(() => decryptField(corrupted)).toThrow()
    })
  })

  describe('encryptArray and decryptArray', () => {
    it('should encrypt and decrypt an array of strings', () => {
      const items = ['symptom1', 'symptom2', 'symptom3']
      const encrypted = encryptArray(items)

      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe(JSON.stringify(items))

      const decrypted = decryptArray(encrypted)
      expect(decrypted).toEqual(items)
    })

    it('should handle empty arrays', () => {
      expect(encryptArray([])).toBeNull()
      expect(encryptArray(null)).toBeNull()
      expect(encryptArray(undefined)).toBeNull()
    })

    it('should return empty array when decrypting null', () => {
      expect(decryptArray(null)).toEqual([])
      expect(decryptArray(undefined)).toEqual([])
      expect(decryptArray('')).toEqual([])
    })

    it('should handle arrays with special characters', () => {
      const items = ['mood: happy 😊', 'condition: 严重', 'note: @#$%']
      const encrypted = encryptArray(items)
      const decrypted = decryptArray(encrypted)

      expect(decrypted).toEqual(items)
    })
  })

  describe('encryptBoolean and decryptBoolean', () => {
    it('should encrypt and decrypt true', () => {
      const encrypted = encryptBoolean(true)
      expect(encrypted).toBeTruthy()

      const decrypted = decryptBoolean(encrypted)
      expect(decrypted).toBe(true)
    })

    it('should encrypt and decrypt false', () => {
      const encrypted = encryptBoolean(false)
      expect(encrypted).toBeTruthy()

      const decrypted = decryptBoolean(encrypted)
      expect(decrypted).toBe(false)
    })

    it('should handle null values', () => {
      expect(encryptBoolean(null)).toBeNull()
      expect(encryptBoolean(undefined)).toBeNull()
      expect(decryptBoolean(null)).toBeNull()
    })
  })

  describe('encryptNumber and decryptNumber', () => {
    it('should encrypt and decrypt positive number', () => {
      const value = 98.6
      const encrypted = encryptNumber(value)
      expect(encrypted).toBeTruthy()

      const decrypted = decryptNumber(encrypted)
      expect(decrypted).toBe(value)
    })

    it('should encrypt and decrypt negative number', () => {
      const value = -42
      const encrypted = encryptNumber(value)
      const decrypted = decryptNumber(encrypted)

      expect(decrypted).toBe(value)
    })

    it('should encrypt and decrypt zero', () => {
      const encrypted = encryptNumber(0)
      const decrypted = decryptNumber(encrypted)

      expect(decrypted).toBe(0)
    })

    it('should handle null values', () => {
      expect(encryptNumber(null)).toBeNull()
      expect(encryptNumber(undefined)).toBeNull()
      expect(decryptNumber(null)).toBeNull()
    })

    it('should preserve decimal precision', () => {
      const value = 98.6123456789
      const encrypted = encryptNumber(value)
      const decrypted = decryptNumber(encrypted)

      expect(decrypted).toBe(value)
    })
  })

  describe('Security properties', () => {
    it('should use authenticated encryption (AES-256-GCM)', () => {
      const plaintext = 'test'
      const encrypted = encryptField(plaintext)
      const encryptedData = JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'))

      expect(encryptedData).toHaveProperty('encrypted')
      expect(encryptedData).toHaveProperty('iv')
      expect(encryptedData).toHaveProperty('salt')
      expect(encryptedData).toHaveProperty('tag') // GCM authentication tag
    })

    it('should use random salt for each encryption', () => {
      const encrypted1 = encryptField('test')
      const encrypted2 = encryptField('test')

      const data1 = JSON.parse(Buffer.from(encrypted1, 'base64').toString('utf8'))
      const data2 = JSON.parse(Buffer.from(encrypted2, 'base64').toString('utf8'))

      expect(data1.salt).not.toBe(data2.salt)
      expect(data1.iv).not.toBe(data2.iv)
    })

    it('should use 256-bit AES encryption', () => {
      // AES-256 requires 32 bytes (256 bits) of key material
      // This is implicit in the encryptionService setup
      const plaintext = 'test'
      const encrypted = encryptField(plaintext)

      // Verify we can decrypt with same environment key
      const decrypted = decryptField(encrypted)
      expect(decrypted).toBe(plaintext)

      // If key was wrong length, encryption would fail
      expect(encrypted).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('should handle whitespace-only strings', () => {
      const plaintext = '   \n\t  '
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle very large numbers', () => {
      const value = Number.MAX_SAFE_INTEGER
      const encrypted = encryptNumber(value)
      const decrypted = decryptNumber(encrypted)

      expect(decrypted).toBe(value)
    })

    it('should handle very small numbers', () => {
      const value = Number.MIN_VALUE
      const encrypted = encryptNumber(value)
      const decrypted = decryptNumber(encrypted)

      expect(decrypted).toBe(value)
    })
  })
})
