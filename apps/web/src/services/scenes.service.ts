import type { SceneAnalysis, Shot, ShotPlan } from "@ca/shared-types"
import { toast } from "sonner"

import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

export const scenesService = {
  analyze: async (
    rawText: string,
    styleReference?: string,
    projectId?: string,
  ): Promise<SceneAnalysis> => {
    try {
      const { data } = await api.post<SceneAnalysis>("/api/scenes/analyze", {
        raw_text: rawText,
        style_reference: styleReference,
        project_id: projectId,
      })
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to analyze scene"))
      throw error
    }
  },

  get: async (sceneId: string): Promise<SceneAnalysis> => {
    try {
      const { data } = await api.get<SceneAnalysis>(`/api/scenes/${encodeURIComponent(sceneId)}`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load scene"))
      throw error
    }
  },

  createShotPlan: async (sceneId: string): Promise<ShotPlan> => {
    try {
      const { data } = await api.post<ShotPlan>(
        `/api/scenes/${encodeURIComponent(sceneId)}/shot-plan`,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate shot plan"))
      throw error
    }
  },

  getShots: async (sceneId: string): Promise<Shot[]> => {
    try {
      const { data } = await api.get<Shot[]>(`/api/scenes/${encodeURIComponent(sceneId)}/shots`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load shots"))
      throw error
    }
  },
}
