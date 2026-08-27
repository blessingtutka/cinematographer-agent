import type { ShotPlan } from "@ca/shared-types"
import { useEffect, useState } from "react"

import { getShotPlan } from "@/lib/api-client"

const planCache = new Map<string, ShotPlan>()

export function useShotPlan(sceneId: string | undefined) {
  const [shotPlan, setShotPlan] = useState<ShotPlan | null>(
    sceneId ? (planCache.get(sceneId) ?? null) : null,
  )
  const [loading, setLoading] = useState(Boolean(sceneId && !planCache.has(sceneId)))
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sceneId) {
      return
    }

    const cached = planCache.get(sceneId)
    if (cached) {
      return
    }

    let active = true
    void getShotPlan(sceneId)
      .then((plan) => {
        if (!active) {
          return
        }
        planCache.set(sceneId, plan)
        setShotPlan(plan)
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }
        setError(reason instanceof Error ? reason : new Error("Failed to load shot plan"))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [sceneId])

  return { shotPlan, loading, error }
}
