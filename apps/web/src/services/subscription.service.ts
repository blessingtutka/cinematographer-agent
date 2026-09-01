import { toast } from "sonner"

import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

export type SubscriptionTier = "free" | "basic" | "pro" | "enterprise"

/** Project-count limit per tier (null = unlimited). */
export type TierLimits = Record<SubscriptionTier, number | null>

export interface ProjectQuota {
  current_count: number
  limit: number | null
  tier: SubscriptionTier
}

export interface UserOut {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_verified: boolean
  is_2fa_enabled: boolean
  subscription_tier: SubscriptionTier
}

// Static feature list per tier — derived from the schema, kept in the
// frontend so the settings page can render without extra round-trips.
export const TIER_FEATURES: Record<
  SubscriptionTier,
  { label: string; description: string; features: string[] }
> = {
  free: {
    label: "Free",
    description: "Get started with one project.",
    features: ["1 project", "Scene analysis", "Shot planning", "Simulation viewer"],
  },
  basic: {
    label: "Basic",
    description: "For independent filmmakers.",
    features: ["3 projects", "Everything in Free", "Style references", "Priority processing"],
  },
  pro: {
    label: "Pro",
    description: "For professional productions.",
    features: [
      "10 projects",
      "Everything in Basic",
      "Research agent",
      "Advanced shot planning",
      "Export tools",
    ],
  },
  enterprise: {
    label: "Enterprise",
    description: "Unlimited scale for studios.",
    features: [
      "Unlimited projects",
      "Everything in Pro",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
}

export const TIER_ORDER: SubscriptionTier[] = ["free", "basic", "pro", "enterprise"]

export const subscriptionService = {
  /**
   * Returns the project-count limit for each tier (null = unlimited).
   * Public — no auth required.
   */
  getTiers: async (): Promise<TierLimits> => {
    try {
      const { data } = await api.get<TierLimits>("/api/subscription/tiers")
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load subscription tiers"))
      throw error
    }
  },

  /**
   * Returns the current user's project usage vs their tier limit.
   * Requires auth.
   */
  getQuota: async (): Promise<ProjectQuota> => {
    try {
      const { data } = await api.get<ProjectQuota>("/api/subscription/quota")
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load project quota"))
      throw error
    }
  },

  /**
   * Upgrades (or downgrades) the current user's subscription tier.
   * NOTE: in production this is driven by a payment webhook, not a direct
   * client call. This stub lets you exercise the tier logic end-to-end.
   */
  changeTier: async (tier: SubscriptionTier): Promise<UserOut> => {
    try {
      const { data } = await api.post<UserOut>("/api/subscription/upgrade", { tier })
      toast.success(`Subscription updated to ${TIER_FEATURES[tier].label}`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update subscription"))
      throw error
    }
  },
}
