import type { ReactNode } from "react"

import Footer from "./Footer"
import Header from "./Header"
import type { SiteNavLink } from "./navigation"
import ScrollToTop from "./ScrollToTop"

type SiteLayoutProps = {
  children: ReactNode
  links?: SiteNavLink[]
}

function SiteLayout({ children, links }: SiteLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <ScrollToTop />
      <Header links={links} />
      {children}
      <Footer />
    </div>
  )
}

export default SiteLayout
