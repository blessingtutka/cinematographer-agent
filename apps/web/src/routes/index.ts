import type { RouteObject } from "react-router-dom"

import { privateRoutes } from "./private.routes"
import { publicRoutes } from "./public.routes"

export const routes: RouteObject[] = [...publicRoutes, ...privateRoutes]
