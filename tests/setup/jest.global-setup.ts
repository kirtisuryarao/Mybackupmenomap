import { resetTestDatabase } from './test-db'

export default async function globalSetup() {
  try {
    await resetTestDatabase()
  } catch (error) {
    if (process.env.CI === 'true') {
      throw error
    }
    // In local/dev environments, allow tests to run with mocked layers if test DB is unavailable.
    console.warn('Test DB reset skipped:', error instanceof Error ? error.message : 'Unknown error')
  }
}
