import { createContext, createElement, type ReactNode,useContext, useState } from "react"

export type User = {
  id: string
  email: string
  name: string
}

type UserContextValue = {
  user: User | null
  isAuthenticated: boolean
  signIn: (email: string) => void
  signOut: () => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)
const userStorageKey = "cinematographer.user"

function readStoredUser(): User | null {
  const storedUser = window.localStorage.getItem(userStorageKey)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as User
  } catch {
    window.localStorage.removeItem(userStorageKey)
    return null
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  function signIn(email: string) {
    const nextUser = {
      id: email,
      email,
      name: email.split("@")[0] || "Director",
    }

    window.localStorage.setItem(userStorageKey, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  function signOut() {
    window.localStorage.removeItem(userStorageKey)
    setUser(null)
  }

  return createElement(
    UserContext.Provider,
    { value: { user, isAuthenticated: user !== null, signIn, signOut } },
    children,
  )
}

export function useUser() {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }

  return context
}
