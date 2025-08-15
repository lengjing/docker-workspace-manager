import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-background flex flex-col items-center justify-center gap-6 p-6 md:p-10" style={{ minHeight: 'calc(100svh - 90px)' }}>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
