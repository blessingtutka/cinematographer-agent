import { toast } from "sonner"

import { tokenStorage } from "@/lib/api/token-storage"
import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

interface LoginResponse {
  requires_2fa: boolean
  pre_2fa_token: string | null
  tokens: TokenPair | null
}

interface User {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_verified: boolean
  is_2fa_enabled: boolean
  subscription_tier: "free" | "basic" | "pro" | "enterprise"
  avatar: string | null
  /** Convenience alias kept for components that read `user.name` */
  name: string
}

export const authService = {
  register: async (email: string, password: string, fullName?: string): Promise<User> => {
    try {
      const { data } = await api.post<User>("/auth/register", {
        email,
        password,
        full_name: fullName,
      })
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to register"))
      throw error
    }
  },

  // login and go to 2fa if setted
  login: async (email: string, password: string) => {
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", { email, password })

      if (data.requires_2fa) {
        return { requiresTwoFactor: true as const, preTwoFactorToken: data.pre_2fa_token! }
      }

      tokenStorage.setTokens(data.tokens!.access_token, data.tokens!.refresh_token)
      return { requiresTwoFactor: false as const }
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid email or password"))
      throw error
    }
  },

  // Second step of a 2FA login: code is either a 6-digit TOTP code or a
  // backup code like "A1B2-C3D4".
  verifyTwoFactor: async (preTwoFactorToken: string, code: string) => {
    try {
      const { data } = await api.post<TokenPair>("/auth/2fa/login-verify", {
        pre_2fa_token: preTwoFactorToken,
        code,
      })
      tokenStorage.setTokens(data.access_token, data.refresh_token)
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid authentication code"))
      throw error
    }
  },

  getMe: async (): Promise<User> => {
    try {
      const { data } = await api.get<User>("/auth/me")
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to fetch user profile"))
      throw error
    }
  },

  logout: async () => {
    try {
      const refreshToken = tokenStorage.getRefreshToken()
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken })
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Logout request failed"))
    } finally {
      tokenStorage.clear()
      window.location.href = "/login"
    }
  },

  // 2FA setup/management (already authenticated)
  setupTwoFactor: async () => {
    try {
      const { data } = await api.post<{
        secret: string
        provisioning_uri: string
        qr_code_base64: string
      }>("/auth/2fa/setup")
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to start 2FA setup"))
      throw error
    }
  },

  enableTwoFactor: async (code: string) => {
    try {
      const { data } = await api.post<{ backup_codes: string[] }>("/auth/2fa/enable", { code })
      toast.success("Two-factor authentication enabled")
      return data.backup_codes
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid authentication code"))
      throw error
    }
  },

  disableTwoFactor: async (password: string, code: string) => {
    try {
      await api.post("/auth/2fa/disable", { password, code })
      toast.success("Two-factor authentication disabled")
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to disable 2FA"))
      throw error
    }
  },

  regenerateBackupCodes: async () => {
    try {
      const { data } = await api.post<{ backup_codes: string[] }>(
        "/auth/2fa/backup-codes/regenerate",
      )
      return data.backup_codes
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to regenerate backup codes"))
      throw error
    }
  },
}
