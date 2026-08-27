import { Code, Film } from "lucide-react"
import { Link } from "react-router-dom"

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-background">
      {/* Subtle cinematic glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <Link
            to="/"
            className="group inline-flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105">
              <Film className="h-5 w-5 text-primary-foreground" />
            </div>

            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Cinematographer Agent</span>

                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  v1.0
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                From script to cinematic vision.
              </p>
            </div>
          </Link>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="View project on GitHub"
            className="mt-7 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
          >
            <Code className="h-4 w-4 text-primary" />
            View project on GitHub
          </a>
        </div>

        {/* Divider */}
        <div className="mx-auto my-8 max-w-2xl border-t border-border/50" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
          <p className="text-xs text-muted-foreground">© 2026 Cinematographer Agent</p>

          <span aria-hidden="true" className="hidden text-muted-foreground/40 sm:block">
            •
          </span>

          <p className="text-xs text-muted-foreground/70">AI-assisted cinematic planning</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
