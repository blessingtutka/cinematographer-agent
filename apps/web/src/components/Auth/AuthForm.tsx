import { Eye, EyeOff } from "lucide-react"
import { type SubmitEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type AuthMode = "login" | "register"

type AuthFormProps = {
  mode: AuthMode
  email: string
  onEmailChange: (email: string) => void
  onSubmit: (event: SubmitEvent) => void
  onModeChange: (mode: AuthMode) => void
  onNameChange: (name: string) => void
  onPasswordChange: (password: string) => void
  name: string
  password: string
  disabled?: boolean
}

export function AuthForm({
  mode,
  email,
  onEmailChange,
  onSubmit,
  onModeChange,
  onNameChange,
  onPasswordChange,
  name,
  password,
  disabled = false,
}: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")

  function handleSubmit(event: SubmitEvent) {
    if (mode === "register" && password !== confirmPassword) {
      event.preventDefault()
      toast.error("Passwords do not match")
      return
    }

    onSubmit(event)
  }

  return (
    <>
      <div className="mt-7 grid grid-cols-2 border-b border-border">
        {(["login", "register"] as AuthMode[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onModeChange(tab)}
            className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${mode === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-6 min-h-0 max-h-[calc(90dvh-20rem)] space-y-4 overflow-y-auto overscroll-contain pr-3 scrollbar-gutter-stable sm:max-h-[calc(90dvh-22rem)]"
      >
        {mode === "register" && (
          <label className="block text-sm font-medium text-foreground">
            Full name
            <input
              required
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="mt-2 h-11 w-full border border-input bg-background px-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="Ava Director"
            />
          </label>
        )}
        <label className="block text-sm font-medium text-foreground">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="mt-2 h-11 w-full border border-input bg-background px-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            placeholder="director@example.com"
          />
        </label>
        <label className="block text-sm font-medium text-foreground">
          Password
          <div className="relative mt-2">
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="h-11 w-full border border-input bg-background px-3 pr-11 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </label>
        {mode === "register" && (
          <label className="block text-sm font-medium text-foreground">
            Confirm password
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 h-11 w-full border border-input bg-background px-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="Repeat your password"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <span className="mt-1 block text-xs text-destructive">Passwords do not match</span>
            )}
          </label>
        )}
        <Button
          type="submit"
          disabled={disabled}
          className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/80"
        >
          {mode === "login" ? "Continue to studio" : "Create studio account"}
        </Button>
      </form>
    </>
  )
}
