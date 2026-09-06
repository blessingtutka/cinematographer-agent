import { createElement } from "react"
import { Navigate, Outlet, type RouteObject, useLocation, useMatches } from "react-router-dom"

import { AppLayout } from "@/components/Layout"
import type { AppLayoutProps } from "@/components/Layout/AppLayout"
import AccountSettings from "@/pages/AccountSettings"
import Drones from "@/pages/Drones"
import ProjectDetail from "@/pages/ProjectDetail"
import Projects from "@/pages/Projects"
import {
  StudioAnalysis,
  StudioCoverage,
  StudioDrones,
  StudioInput,
  StudioSimulation,
} from "@/pages/studio/StudioStages"
import { StudioWorkspace } from "@/pages/studio/StudioWorkspace"
import { useUser } from "@/providers/user.provider"

function PrivateRoute() {
  const { isAuthenticated, isLoading } = useUser()
  const location = useLocation()
  const matches = useMatches()

  if (isLoading) {
    return createElement(
      "div",
      { className: "flex min-h-screen items-center justify-center" },
      "Checking authentication…",
    )
  }

  if (!isAuthenticated) {
    return createElement(Navigate, {
      to: "/auth",
      replace: true,
      state: { from: location },
    })
  }

  const currentRoute = matches[matches.length - 1]

  const breadcrumb =
    currentRoute?.handle &&
    typeof currentRoute.handle === "object" &&
    "breadcrumb" in currentRoute.handle
      ? (currentRoute.handle.breadcrumb as AppLayoutProps[])
      : undefined

  return createElement(AppLayout, { breadcrumb } as AppLayoutProps, createElement(Outlet))
}

export const privateRoutes: RouteObject[] = [
  {
    element: createElement(PrivateRoute),
    children: [
      {
        path: "/projects",
        handle: { breadcrumb: [{ label: "projects", link: "/projects" }] },
        element: createElement(Projects),
      },
      {
        path: "/projects/:projectId",
        handle: { breadcrumb: [{ label: "project", link: "/projects/:projectId" }] },
        element: createElement(ProjectDetail),
      },
      {
        path: "/studio",
        element: createElement(StudioWorkspace),
        children: [
          { index: true, element: createElement(Navigate, { to: "input", replace: true }) },
          { path: "input", element: createElement(StudioInput) },
          { path: "drones", element: createElement(StudioDrones) },
          { path: "analysis", element: createElement(StudioAnalysis) },
          { path: "coverage", element: createElement(StudioCoverage) },
          { path: "simulation", element: createElement(StudioSimulation) },
        ],
      },
      {
        path: "/drones",
        handle: { breadcrumb: [{ label: "drones", link: "/drones" }] },
        element: createElement(Drones),
      },
      {
        path: "/settings",
        handle: { breadcrumb: [{ label: "settings", link: "/settings" }] },
        element: createElement(AccountSettings),
      },
    ],
  },
]
