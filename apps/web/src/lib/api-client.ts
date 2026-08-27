import type { DroneStatus, SceneAnalysis, Shot, ShotPlan, Simulation } from "@ca/shared-types"

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { detail?: string }
      detail = body.detail ?? detail
    } catch {
      // Keep the HTTP status text when the server response is not JSON.
    }
    throw new Error(`${response.status}: ${detail}`)
  }

  return response.json() as Promise<T>
}

export function analyzeScene(rawText: string, styleReference?: string) {
  return request<SceneAnalysis>("/api/scenes/analyze", {
    method: "POST",
    body: JSON.stringify({ raw_text: rawText, style_reference: styleReference }),
  })
}

export function getScene(sceneId: string) {
  return request<SceneAnalysis>(`/api/scenes/${encodeURIComponent(sceneId)}`)
}

export function getShotPlan(sceneId: string) {
  return request<ShotPlan>(`/api/scenes/${encodeURIComponent(sceneId)}/shot-plan`, {
    method: "POST",
  })
}

export function getShots(sceneId: string) {
  return request<Shot[]>(`/api/scenes/${encodeURIComponent(sceneId)}/shots`)
}

export function getDrones() {
  return request<DroneStatus[]>("/api/drones")
}

export function getDrone(droneId: string) {
  return request<DroneStatus>(`/api/drones/${encodeURIComponent(droneId)}`)
}

export function createSimulation(sceneId: string) {
  return request<Simulation>("/api/simulations", {
    method: "POST",
    body: JSON.stringify({ scene_id: sceneId }),
  })
}

export function startSimulation(simulationId: string) {
  return request<Simulation>(`/api/simulations/${encodeURIComponent(simulationId)}/start`, {
    method: "POST",
  })
}

export function pauseSimulation(simulationId: string) {
  return request<Simulation>(`/api/simulations/${encodeURIComponent(simulationId)}/pause`, {
    method: "POST",
  })
}

export function stopSimulation(simulationId: string) {
  return request<Simulation>(`/api/simulations/${encodeURIComponent(simulationId)}/stop`, {
    method: "POST",
  })
}

export function simulationWebSocketUrl(simulationId: string) {
  const url = new URL(API_BASE_URL)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = `/ws/simulations/${encodeURIComponent(simulationId)}`
  return url.toString()
}
