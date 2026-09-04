import { toast } from "sonner"

import { getErrorMessage } from "@/lib/utils/error-handler"

import api from "./axios.service"

export interface Project {
  project_id: string
  title: string
  description: string
  created_at: string
  updated_at: string
}

export interface ProjectScene {
  scene_id: string
  project_id: string
  title: string
  description: string
  raw_text: string
  created_at: string
  updated_at: string
}

export const projectsService = {
  list: async (): Promise<Project[]> => {
    try {
      const { data } = await api.get<Project[]>("/projects")
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load projects"))
      throw error
    }
  },

  get: async (projectId: string): Promise<Project> => {
    try {
      const { data } = await api.get<Project>(`/projects/${encodeURIComponent(projectId)}`)
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load project"))
      throw error
    }
  },

  create: async (title: string, description: string): Promise<Project> => {
    try {
      const { data } = await api.post<Project>("/projects", { title, description })
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create project"))
      throw error
    }
  },

  update: async (
    projectId: string,
    values: { title?: string; description?: string },
  ): Promise<Project> => {
    try {
      const { data } = await api.patch<Project>(
        `/projects/${encodeURIComponent(projectId)}`,
        values,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update project"))
      throw error
    }
  },

  delete: async (projectId: string): Promise<void> => {
    try {
      await api.delete(`/projects/${encodeURIComponent(projectId)}`)
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete project"))
      throw error
    }
  },

  listScenes: async (projectId: string): Promise<ProjectScene[]> => {
    try {
      const { data } = await api.get<ProjectScene[]>(
        `/projects/${encodeURIComponent(projectId)}/scenes`,
      )
      return data
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load project scenes"))
      throw error
    }
  },
}
