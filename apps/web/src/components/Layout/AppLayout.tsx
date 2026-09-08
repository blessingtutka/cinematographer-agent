import type { ReactNode } from "react"

import { AppSidebar } from "@/components/Layout/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useUser } from "@/providers/user.provider"

import { AppHeader } from "./AppHeader"
import ScrollToTop from "./ScrollToTop"

export type AppLayoutProps = {
  breadcrumb?: BreadcrumbItem[]
  children: ReactNode
}

export function AppLayout({ breadcrumb, children }: AppLayoutProps) {
  const { user, signOut } = useUser()

  return (
    <SidebarProvider defaultOpen>
      <ScrollToTop />
      <AppSidebar user={user} onSignOut={signOut} />
      <SidebarInset>
        <AppHeader breadcrumb={breadcrumb} />
        <main className="bg-background min-h-[calc(100svh-3.5rem)] flex-1 flex items-center justify-center px-4  pb-12 pt-8 text-foreground sm:px-6 lg:px-8 z-0">
          <div className="relative w-full h-full flex items-center justify-center">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
