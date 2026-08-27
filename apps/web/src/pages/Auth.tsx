import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react"
import { type SubmitEvent, useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AuthForm } from "@/components/Auth/AuthForm"
import { PasswordResetDialog } from "@/components/Auth/PasswordResetDialog"
import { TwoFactorDialog } from "@/components/Auth/TwoFactorDialog"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useUser } from "@/providers/user.provider"

type AuthMode = "login" | "register"

function Auth() {
  const {
    isAuthenticated,
    signIn,
    register,
    verifyTwoFactor,
    completeSignIn,
    requestPasswordReset,
  } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorOpen, setTwoFactorOpen] = useState(false)
  const [code, setCode] = useState("")
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")

  const destination =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/studio"

  if (isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (mode === "register") {
      register(name, email, password)
      toast.success("Account created", { description: "Your studio workspace is ready." })
      navigate(destination, { replace: true })
      return
    }
    if (signIn(email, password)) {
      setTwoFactorOpen(true)
    } else {
      toast.error("Enter your email")
    }
  }

  function handleVerify(event: SubmitEvent) {
    event.preventDefault()
    if (verifyTwoFactor(code)) {
      completeSignIn(email)
      setTwoFactorOpen(false)
      navigate(destination, { replace: true })
    } else {
      toast.error("That authenticator code is not valid")
    }
  }

  function handleReset() {
    requestPasswordReset(resetEmail)
    setResetOpen(false)
    toast.success("Reset link requested", {
      description: "If the account exists, a link will be sent shortly.",
    })
  }

  return (
    <main className="mesh-bg flex h-dvh min-h-0 items-center justify-center overflow-hidden px-4 py-4 text-foreground sm:px-6">
      <section className="relative flex h-[90dvh] max-h-[90dvh] w-full max-w-md flex-col overflow-hidden border border-border bg-card/95 p-6 shadow-2xl shadow-primary/10 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cinematographer Agent
          </Link>
          <ThemeToggle />
        </div>
        <div className="mt-10 flex items-center gap-3 text-primary">
          <ShieldCheck className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Private studio access
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-card-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {mode === "login"
            ? "Sign in to continue planning your next scene."
            : "Start building shot plans with your private workspace."}
        </p>
        <AuthForm
          mode={mode}
          email={email}
          name={name}
          password={password}
          onEmailChange={setEmail}
          onNameChange={setName}
          onPasswordChange={setPassword}
          onModeChange={setMode}
          onSubmit={handleSubmit}
        />
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setResetEmail(email)
              setResetOpen(true)
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent-foreground"
          >
            <KeyRound className="size-4" />
            Forgot your password?
          </button>
        )}
        <p className="mt-8 shrink-0 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mr-1 inline size-3" />
          Placeholder auth API. Two-factor code for local testing:{" "}
          <span className="text-card-foreground">123456</span>
        </p>
      </section>
      <TwoFactorDialog
        open={twoFactorOpen}
        code={code}
        onCodeChange={setCode}
        onOpenChange={setTwoFactorOpen}
        onSubmit={handleVerify}
      />
      <PasswordResetDialog
        open={resetOpen}
        email={resetEmail}
        onOpenChange={setResetOpen}
        onConfirm={handleReset}
      />
    </main>
  )
}

export default Auth
