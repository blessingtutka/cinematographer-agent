import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useUser } from "@/providers/user.provider"

function Studio() {
  const { user, signOut } = useUser()

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-xl border border-border bg-card p-8 text-center shadow-xl shadow-primary/10">
        <p className="text-sm text-primary">Cinematographer Studio</p>
        <h1 className="mt-3 text-3xl font-bold">Welcome, {user?.name}</h1>
        <p className="mt-3 text-muted-foreground">
          Your protected workspace is ready for the shot-planning workflow.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
          >
            <Link to="/">Back home</Link>
          </Button>
          <Button
            onClick={signOut}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  )
}

export default Studio
