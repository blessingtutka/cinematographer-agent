import {
  Activity,
  Camera,
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  Settings2,
  Sparkles,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { type User } from "@/providers/user.provider"

import { NavUser } from "./NavUser"

type AppSidebarProps = {
  user: User | null
  onSignOut: () => void
}

const workspaceLinks = [
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Control room", href: "/studio", icon: LayoutDashboard },
  { label: "Scene input", href: "/studio#scene-input", icon: Clapperboard },
  { label: "Shot plan", href: "/studio#shot-plan", icon: Camera },
]

const monitorLinks = [
  { label: "Director view", href: "/studio#director-view", icon: Activity },
  { label: "Camera feeds", href: "/studio#camera-feeds", icon: Camera },
]

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Cinematographer Agent">
              <Link to="/studio">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
                  <Sparkles className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold">Cinematographer</span>
                  <span className="truncate text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
                    Agent studio
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator className="w-full mx-0" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.href === "/studio" && location.pathname === "/studio"}
                    tooltip={item.label}
                  >
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Monitors</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitorLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <a href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Others</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/settings"}
                  tooltip="Settings"
                >
                  <Link to="/settings">
                    <Settings2 />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <SidebarSeparator className="mb-2" />
          <NavUser user={user} onSignOut={onSignOut} />
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
