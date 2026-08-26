import { createElement } from "react"
import type { RouteObject } from "react-router-dom"

import Auth from "@/pages/Auth"
import Home from "@/pages/Home"
import Technical from "@/pages/Technical"

export const publicRoutes: RouteObject[] = [
  {
    path: "/",
    element: createElement(Home),
  },
  {
    path: "/auth",
    element: createElement(Auth),
  },
  {
    path: "/technical",
    element: createElement(Technical),
  },
]
