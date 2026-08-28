import "./App.css"

import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Toaster } from "sonner"

import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/providers/theme.provider"
import { UserProvider } from "@/providers/user.provider"
import { routes } from "@/routes"

const router = createBrowserRouter(routes)

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  )
}

export default App
