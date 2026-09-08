import { motion } from "framer-motion"
import { Film, Menu, Play, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { useUser } from "@/providers/user.provider"

import { type SiteNavLink, siteNavLinks } from "./navigation"

type HeaderProps = {
  links?: SiteNavLink[]
}

function Header({ links = siteNavLinks }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useUser()
  const actionHref = isAuthenticated ? "/studio" : "/auth"
  const actionLabel = isAuthenticated ? "Open Studio" : "Try the Demo"

  return (
    <motion.nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 transition-all duration-300 group-hover:shadow-primary/40">
              <Film className="h-5 w-5 text-primary-foreground" strokeWidth={1.8} />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Cinematographer
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              CA
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                reloadDocument={link.href.startsWith("/#")}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/80"
            >
              <Link to={actionHref}>
                <Play className="mr-2 h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: mobileMenuOpen ? "auto" : 0, opacity: mobileMenuOpen ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden border-t border-border/60 md:hidden"
      >
        <div className="space-y-3 bg-background/95 px-4 py-6">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              reloadDocument={link.href.startsWith("/#")}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-foreground/80 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Button
            asChild
            className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/80"
          >
            <Link to={actionHref} onClick={() => setMobileMenuOpen(false)}>
              <Play className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </motion.div>
    </motion.nav>
  )
}

export default Header
