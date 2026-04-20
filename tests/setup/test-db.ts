import dotenv from 'dotenv'
import { Client } from 'pg'

dotenv.config({ path: '.env.test', quiet: true })

function ensureSafeTestDatabaseUrl(databaseUrl: string) {
  const normalized = databaseUrl.toLowerCase()
  if (!normalized.includes('test')) {
    throw new Error('Refusing to reset non-test database. DATABASE_URL in .env.test must point to a dedicated test DB.')
  }
}

export async function resetTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    return
  }

  ensureSafeTestDatabaseUrl(databaseUrl)

  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
    await client.query('TRUNCATE TABLE "chat_messages", "consents", "cycle_entries", "cycles", "daily_logs", "fertility_logs", "medications", "notification_settings", "partners", "partner_refresh_tokens", "predictions", "privacy_settings", "refresh_tokens", "symptom_logs", "users" RESTART IDENTITY CASCADE;')
  } finally {
    await client.end()
  }
}
