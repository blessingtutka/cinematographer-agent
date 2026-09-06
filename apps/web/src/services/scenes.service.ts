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
      const { data } = await api.post<SceneAnalysis>("/scenes/analyze", {
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
      const { data } = await api.get<SceneAnalysis>(`/scenes/${encodeURIComponent(sceneId)}`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load scene"))
      throw error
    }
  },

  update: async (
    sceneId: string,
    values: Pick<SceneAnalysis, "title" | "description" | "raw_text">,
  ): Promise<SceneAnalysis> => {
    const { data } = await api.patch<SceneAnalysis>(
      `/scenes/${encodeURIComponent(sceneId)}`,
      values,
    )
    return data
  },

  createShotPlan: async (sceneId: string, droneIds: string[] = []): Promise<ShotPlan> => {
    try {
      const { data } = await api.post<ShotPlan>(
        `/scenes/${encodeURIComponent(sceneId)}/shot-plan`,
        { drone_ids: droneIds },
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to generate shot plan"))
      throw error
    }
  },

  getShotPlan: async (sceneId: string): Promise<ShotPlan> => {
    const { data } = await api.get<ShotPlan>(`/scenes/${encodeURIComponent(sceneId)}/shot-plan`)
    return data
  },

  getShots: async (sceneId: string): Promise<Shot[]> => {
    try {
      const { data } = await api.get<Shot[]>(`/scenes/${encodeURIComponent(sceneId)}/shots`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load shots"))
      throw error
    }
  },
}
