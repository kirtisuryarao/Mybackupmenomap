export class AppSetupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppSetupError'
  }
}

export function isAppSetupError(error: unknown): error is AppSetupError {
  return error instanceof AppSetupError
}
