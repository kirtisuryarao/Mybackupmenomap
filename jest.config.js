const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const commonConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/tests/',
    '/types/',
    '\\.(d|spec)\\.ts$',
    '\\.(config|setup)\\.(js|ts|mjs|cjs)$',
    'fallback',
    'mock',
  ],
  collectCoverageFrom: [
    'lib/services/aiService.ts',
    'lib/services/cycleService.ts',
    'lib/services/fertilityService.ts',
    'lib/services/insightService.ts',
    'lib/services/notificationService.ts',
    'lib/services/reminderService.ts',
    'lib/services/safetyService.ts',
    'lib/security/privacyService.ts',
    'app/api/ai/query/route.ts',
    'app/api/cycle/prediction/route.ts',
    'app/api/fertility/log/route.ts',
    '!**/*.d.ts',
    '!**/*.test.ts',
    '!**/tests/**',
    '!**/types/**',
    '!**/*.{config,setup}.{js,ts,mjs,cjs}',
    '!**/*mock*',
    '!**/*fallback*',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/tests/e2e/'],
}

const config = {
  ...commonConfig,
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration-db/**/*.test.ts',
    '<rootDir>/lib/**/*.test.ts',
  ],
}

module.exports = createJestConfig(config)
