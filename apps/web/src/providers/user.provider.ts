import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { tokenStorage } from "@/lib/api/token-storage"
import { authService } from "@/services/auth.service"

export type User = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_verified: boolean
  is_2fa_enabled: boolean
  subscription_tier: "free" | "basic" | "pro" | "enterprise"
  /** Convenience alias kept for components that read `user.name` */
  name: string
  avatar: string | null
}

type LoginResult =
  { requiresTwoFactor: false } | { requiresTwoFactor: true; preTwoFactorToken: string }

type UserContextValue = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  /** Real API login. Returns 2FA challenge info when needed. */
  signIn: (email: string, password: string) => Promise<LoginResult>
  /** Real API register. */
  register: (email: string, password: string, fullName?: string) => Promise<void>
  /** Real API 2FA verification step. */
  verifyTwoFactor: (preTwoFactorToken: string, code: string) => Promise<void>
  /** Refresh `user` from /auth/me (useful after profile changes). */
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

function mapUser(raw: Awaited<ReturnType<typeof authService.getMe>>): User {
  return {
    ...raw,
    avatar: raw.avatar ?? null,
    name: raw.full_name ?? raw.email.split("@")[0] ?? "Director",
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => !tokenStorage.getAccessToken())

  // On mount, restore session from stored tokens
  useEffect(() => {
    const accessToken = tokenStorage.getAccessToken()
    if (!accessToken) {
      return
    }
    authService
      .getMe()
      .then((raw) => setUser(mapUser(raw)))
      .catch(() => {
        // Token may be expired/invalid; interceptor will attempt refresh.
        // If it still fails, clear state.
        tokenStorage.clear()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await authService.login(email, password)
    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true, preTwoFactorToken: result.preTwoFactorToken }
    }
    const raw = await authService.getMe()
    setUser(mapUser(raw))
    return { requiresTwoFactor: false }
  }, [])

  const register = useCallback(
    async (email: string, password: string, fullName?: string): Promise<void> => {
      await authService.register(email, password, fullName)
      // After registration users still need to log in; keep them on /auth.
    },
    [],
  )

  const verifyTwoFactor = useCallback(
    async (preTwoFactorToken: string, code: string): Promise<void> => {
      await authService.verifyTwoFactor(preTwoFactorToken, code)
      const raw = await authService.getMe()
      setUser(mapUser(raw))
    },
    [],
  )

  const refreshUser = useCallback(async (): Promise<void> => {
    const raw = await authService.getMe()
    setUser(mapUser(raw))
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await authService.logout()
    setUser(null)
  }, [])

  return createElement(
    UserContext.Provider,
    {
      value: {
        user,
        isAuthenticated: user !== null,
        isLoading,
        signIn,
        register,
        verifyTwoFactor,
        refreshUser,
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
