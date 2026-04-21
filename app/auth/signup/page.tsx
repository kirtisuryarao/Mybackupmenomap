import { SignupForm } from '../components/signup-form'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/5 to-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">MenoMap</h1>
          <p className="text-muted-foreground">Track your health and symptoms with confidence</p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
