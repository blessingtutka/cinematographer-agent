import "./App.css"

import { BrowserRouter, useRoutes } from "react-router-dom"
import { Toaster } from "sonner"

import { ThemeProvider } from "@/providers/theme.provider"
import { UserProvider } from "@/providers/user.provider"
import { routes } from "@/routes"

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <AppRoutes />
          <Toaster position="bottom-right" richColors />
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  return useRoutes(routes)
}

export default App
