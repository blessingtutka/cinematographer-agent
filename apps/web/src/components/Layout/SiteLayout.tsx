import type { ReactNode } from "react"

import Footer from "./Footer"
import Header from "./Header"
import type { SiteNavLink } from "./navigation"

type SiteLayoutProps = {
  children: ReactNode
  links?: SiteNavLink[]
}

function SiteLayout({ children, links }: SiteLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-hidden dark bg-zinc-950 font-sans text-white">
      <Header links={links} />
      {children}
      <Footer />
    </div>
  )
}

export default SiteLayout
