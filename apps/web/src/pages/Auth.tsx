import { type FormEvent,useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useUser } from "@/providers/user.provider"

function Auth() {
  const { isAuthenticated, signIn } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")

  const destination =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/studio"

  if (isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    signIn(email)
    navigate(destination, { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-md border border-zinc-800 bg-zinc-900/60 p-8">
        <Link to="/" className="text-sm text-zinc-400 hover:text-white">
          Cinematographer Agent
        </Link>
        <h1 className="mt-8 text-3xl font-bold">Sign in to your studio</h1>
        <p className="mt-2 text-zinc-400">Use your email to open the protected workspace.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-10 w-full border border-zinc-700 bg-zinc-950 px-3 text-white outline-none focus:border-purple-500"
              placeholder="director@example.com"
            />
          </label>
          <Button type="submit" className="w-full bg-purple-600 text-white hover:bg-purple-700">
            Continue
          </Button>
        </form>
      </section>
    </main>
  )
}

export default Auth
