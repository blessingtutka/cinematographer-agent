import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useUser } from "@/providers/user.provider"

function Studio() {
  const { user, signOut } = useUser()

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
        <p className="text-sm text-purple-400">Cinematographer Studio</p>
        <h1 className="mt-3 text-3xl font-bold">Welcome, {user?.name}</h1>
        <p className="mt-3 text-zinc-400">
          Your protected workspace is ready for the shot-planning workflow.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            <Link to="/">Back home</Link>
          </Button>
          <Button onClick={signOut} className="bg-purple-600 text-white hover:bg-purple-700">
            Sign out
          </Button>
        </div>
      </section>
    </main>
  )
}

export default Studio
