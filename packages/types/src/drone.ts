/**
 * drone.ts — Types for drone position, orientation, and camera feed state.
 */

import type { Shot } from './shot-plan'

export interface Vector3 {
  x: number
  y: number
  z: number
}

/** Quaternion describing a drone's orientation */
export interface Quaternion {
  x: number
  y: number
  z: number
  w: number
}

export interface DroneStatus {
  drone_id: string
  name: string
  position: Vector3
  orientation: Quaternion
  is_recording: boolean
  /** Present while a shot is actively being executed; absent otherwise */
  active_shot?: Shot
}

/**
 * Represents the camera feed data from a single drone, used to drive
 * first-person R3F viewports in the frontend.
 */
export interface CameraFeed {
  drone_id: string
  drone_name: string
  /** Camera position in world-space */
  position: Vector3
  /** Camera orientation in world-space */
  orientation: Quaternion
  /** Field of view in degrees */
  fov_degrees: number
  is_recording: boolean
}
