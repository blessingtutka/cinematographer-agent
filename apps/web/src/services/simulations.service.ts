import type { Simulation } from "@ca/shared-types"
import { toast } from "sonner"

import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export const simulationsService = {
  create: async (sceneId: string): Promise<Simulation> => {
    try {
      const { data } = await api.post<Simulation>("/api/simulations", { scene_id: sceneId })
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create simulation"))
      throw error
    }
  },

  start: async (simulationId: string): Promise<Simulation> => {
    try {
      const { data } = await api.post<Simulation>(
        `/api/simulations/${encodeURIComponent(simulationId)}/start`,
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
        `/api/simulations/${encodeURIComponent(simulationId)}/pause`,
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
        `/api/simulations/${encodeURIComponent(simulationId)}/stop`,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to stop simulation"))
      throw error
    }
  },

  webSocketUrl: (simulationId: string): string => {
    const url = new URL(API_BASE_URL)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    url.pathname = `/ws/simulations/${encodeURIComponent(simulationId)}`
    return url.toString()
  },
}
