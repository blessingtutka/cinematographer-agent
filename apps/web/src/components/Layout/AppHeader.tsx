import { DoorOpen } from "lucide-react"
import { Fragment } from "react"
import { Link } from "react-router-dom"

import { ThemeToggle } from "@/components/ThemeToggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type AppHeaderProps = {
  breadcrumb?: BreadcrumbItem[]
}

export function AppHeader({ breadcrumb }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4/5 self-center!" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink asChild>
              <Link to="/studio">Workspace</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumb &&
            breadcrumb.map((segment, index) => (
              <Fragment key={index}>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    {segment.link ? (
                      <Link to={segment.link}>
                        {segment.label}
                      </Link>
                    ) : (
                      <span>{segment.label}</span>
                    )}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </Fragment>
            ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <DoorOpen className="size-4" />
            <span className="hidden sm:inline-flex">Exit studio</span>
          </Link>
        </Button>
      </div>
    </header>
  )
}
