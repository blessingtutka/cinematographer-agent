import { createContext, createElement, type ReactNode, useContext, useState } from "react"

export type User = {
  id: string
  email: string
  name: string
}

type UserContextValue = {
  user: User | null
  isAuthenticated: boolean
  signIn: (email: string, password: string) => boolean
  register: (name: string, email: string, password: string) => void
  verifyTwoFactor: (code: string) => boolean
  completeSignIn: (email: string) => void
  requestPasswordReset: (email: string) => void
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

  function createUser(name: string, email: string) {
    const nextUser = {
      id: email,
      email,
      name: name || email.split("@")[0] || "Director",
    }

    window.localStorage.setItem(userStorageKey, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  function signIn(email: string, password: string) {
    return Boolean(email && password)
  }

  function register(name: string, email: string, password: string) {
    if (name && email && password) {
      createUser(name, email)
    }
  }

  function verifyTwoFactor(code: string) {
    return code === "123456"
  }

  function completeSignIn(email: string) {
    createUser("", email)
  }

  function requestPasswordReset(_email: string) {}

  function signOut() {
    window.localStorage.removeItem(userStorageKey)
    setUser(null)
  }

  return createElement(
    UserContext.Provider,
    {
      value: {
        user,
        isAuthenticated: user !== null,
        signIn,
        register,
        verifyTwoFactor,
        completeSignIn,
        requestPasswordReset,
        signOut,
      },
    },
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
