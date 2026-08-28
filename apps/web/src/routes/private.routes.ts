import { createElement } from "react"
import { Navigate, Outlet, type RouteObject, useLocation, useMatches } from "react-router-dom"

import { AppLayout } from "@/components/Layout"
import type { AppLayoutProps } from "@/components/Layout/AppLayout"
import ProjectDetail from "@/pages/ProjectDetail"
import Projects from "@/pages/Projects"
import Studio from "@/pages/Studio"
import { useUser } from "@/providers/user.provider"

function PrivateRoute() {
  const { isAuthenticated } = useUser()
  const location = useLocation()
  const matches = useMatches()

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
        element: createElement(Studio),
      },
    ],
  },
]
