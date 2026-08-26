import { motion, useScroll, useTransform } from "framer-motion"
import { Film, Menu, Play, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useUser } from "@/providers/user.provider"

import { type SiteNavLink,siteNavLinks } from "./navigation"

type HeaderProps = {
  links?: SiteNavLink[]
}

function Header({ links = siteNavLinks }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const { isAuthenticated } = useUser()
  const navBg = useTransform(scrollY, [0, 80], ["rgba(9,9,11,0)", "rgba(9,9,11,0.94)"])
  const actionHref = isAuthenticated ? "/studio" : "/auth"
  const actionLabel = isAuthenticated ? "Open Studio" : "Try the Demo"

  return (
    <motion.nav
      style={{ backgroundColor: navBg }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-800/30 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/20 transition-all duration-300 group-hover:shadow-purple-600/40">
              <Film className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-lg font-bold tracking-tight">Cinematographer</span>
            <span className="rounded-full border border-purple-600/20 bg-purple-600/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              CA
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              className="bg-purple-600 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-700"
            >
              <Link to={actionHref}>
                <Play className="mr-2 h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="p-2 text-zinc-400 transition-colors hover:text-white md:hidden"
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
        className="overflow-hidden border-t border-zinc-800/50 md:hidden"
      >
        <div className="space-y-3 bg-zinc-950/95 px-4 py-6">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-zinc-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className="mt-2 w-full bg-purple-600 text-white hover:bg-purple-700">
            <Link to={actionHref} onClick={() => setMobileMenuOpen(false)}>
              <Play className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        </div>
      </motion.div>
    </motion.nav>
  )
}

export default Header
