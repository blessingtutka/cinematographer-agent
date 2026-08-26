import "./App.css"

import { BrowserRouter, useRoutes } from "react-router-dom"

import { UserProvider } from "@/providers/user.provider"
import { routes } from "@/routes"

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  return useRoutes(routes)
}

export default App
