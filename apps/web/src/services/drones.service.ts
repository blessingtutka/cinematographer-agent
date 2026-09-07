import type { DroneStatus } from "@ca/shared-types"
import { toast } from "sonner"

import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

export const dronesService = {
  create: async (name: string): Promise<DroneStatus> => {
    const { data } = await api.post<DroneStatus>("/drones", { name })
    return data
  },
  list: async (): Promise<DroneStatus[]> => {
    try {
      const { data } = await api.get<DroneStatus[]>("/drones")
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load drones"))
      throw error
    }
  },

  get: async (droneId: string): Promise<DroneStatus> => {
    try {
      const { data } = await api.get<DroneStatus>(`/drones/${encodeURIComponent(droneId)}`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load drone"))
      throw error
    }
  },

  update: async (droneId: string, payload: { name?: string }) => {
    const { data } = await api.patch<DroneStatus>(`/drones/${encodeURIComponent(droneId)}`, payload)
    return data
  },

  remove: async (droneId: string) => {
    await api.delete(`/drones/${encodeURIComponent(droneId)}`)
  },
}
