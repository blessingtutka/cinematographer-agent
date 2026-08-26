/**
 * simulation.ts — Types for simulation lifecycle and WebSocket event stream.
 */

import type { DroneStatus } from './drone'
import type { CameraMovement,ShotType } from './shot-plan'

export type SimulationState = 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED'

export interface Simulation {
  simulation_id: string
  /** References a SceneAnalysis.scene_id */
  scene_id: string
  state: SimulationState
  /** ISO 8601 UTC timestamp */
  created_at: string
  /** ISO 8601 UTC timestamp */
  updated_at: string
}

// ---------------------------------------------------------------------------
// WebSocket event types
// ---------------------------------------------------------------------------

/**
 * Emitted at ≥ 10 Hz while the simulation is in Running state.
 * Contains the latest status snapshot for every drone.
 */
export interface DroneUpdateEvent {
  type: 'drone_update'
  /** ISO 8601 UTC timestamp */
  timestamp: string
  drones: DroneStatus[]
}

/**
 * Emitted when a drone begins executing a shot.
 */
export interface ShotStartedEvent {
  type: 'shot_started'
  shot_id: string
  drone_id: string
  shot_type: ShotType
  camera_movement: CameraMovement
  subject: string
}

/**
 * Emitted when a drone finishes executing a shot.
 */
export interface ShotCompletedEvent {
  type: 'shot_completed'
  shot_id: string
  drone_id: string
  shot_type: ShotType
  camera_movement: CameraMovement
  subject: string
}

/**
 * Emitted whenever the simulation transitions to a new state.
 * The server closes the WebSocket connection after emitting this event
 * for Paused or Completed transitions.
 */
export interface SimulationStateChangeEvent {
  type: 'state_change'
  simulation_id: string
  new_state: SimulationState
  /** ISO 8601 UTC timestamp */
  timestamp: string
}

/** Union of all possible WebSocket event payloads */
export type SimulationEvent =
  | DroneUpdateEvent
  | ShotStartedEvent
  | ShotCompletedEvent
  | SimulationStateChangeEvent
