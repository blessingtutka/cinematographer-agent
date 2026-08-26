import { createElement } from "react"
import { Navigate, Outlet, type RouteObject,useLocation } from "react-router-dom"

import Studio from "@/pages/Studio"
import { useUser } from "@/providers/user.provider"

function PrivateRoute() {
  const { isAuthenticated } = useUser()
  const location = useLocation()

  if (!isAuthenticated) {
    return createElement(Navigate, { to: "/auth", replace: true, state: { from: location } })
  }

  return createElement(Outlet)
}

export const privateRoutes: RouteObject[] = [
  {
    element: createElement(PrivateRoute),
    children: [
      {
        path: "/studio",
        element: createElement(Studio),
      },
    ],
  },
]
