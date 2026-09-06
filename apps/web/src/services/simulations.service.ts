import type { Simulation } from "@ca/shared-types"
import { toast } from "sonner"

import { tokenStorage } from "@/lib/api/token-storage"
import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

const WS_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:8000"

export const simulationsService = {
  create: async (sceneId: string, droneIds: string[] = []): Promise<Simulation> => {
    try {
      const { data } = await api.post<Simulation>("/simulations", {
        scene_id: sceneId,
        drone_ids: droneIds,
      })
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create simulation"))
      throw error
    }
  },

  start: async (simulationId: string): Promise<Simulation> => {
    try {
      const { data } = await api.post<Simulation>(
        `/simulations/${encodeURIComponent(simulationId)}/start`,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to start simulation"))
      throw error
    }
  },

  pause: async (simulationId: string): Promise<Simulation> => {
    try {
      const { data } = await api.post<Simulation>(
        `/simulations/${encodeURIComponent(simulationId)}/pause`,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to pause simulation"))
      throw error
    }
  },

  stop: async (simulationId: string): Promise<Simulation> => {
    try {
      const { data } = await api.post<Simulation>(
        `/simulations/${encodeURIComponent(simulationId)}/stop`,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to stop simulation"))
      throw error
    }
  },

  webSocketUrl: (simulationId: string): string => {
    const url = new URL(WS_BASE_URL)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    url.pathname = `/ws/simulations/${encodeURIComponent(simulationId)}`
    const accessToken = tokenStorage.getAccessToken()
    if (accessToken) {
      url.searchParams.set("access_token", accessToken)
    }
    return url.toString()
  },
}
