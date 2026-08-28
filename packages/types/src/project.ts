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
  created_at: string
  updated_at: string
}
