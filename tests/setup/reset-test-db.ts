import { resetTestDatabase } from './test-db'

async function main() {
  await resetTestDatabase()
  console.log('Test database reset complete')
}

main().catch((error) => {
  console.error('Failed to reset test database:', error)
  process.exit(1)
})
