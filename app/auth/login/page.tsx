import { LoginForm } from '../components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/5 to-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cycle Companion</h1>
          <p className="text-muted-foreground">Track your health, understand your cycle</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
