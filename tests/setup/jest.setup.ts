import dotenv from 'dotenv'

dotenv.config({ path: '.env.test', quiet: true })

afterEach(() => {
  jest.clearAllMocks()
})
