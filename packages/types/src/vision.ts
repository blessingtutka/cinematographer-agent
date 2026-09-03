/**
 * vision.ts — Types for realtime AI Vision analysis emitted by the Vision_Agent.
 *
 * Each drone produces a VisionAnalysis once per simulation tick.  The backend
 * embeds this in DroneStatus (for drone_update events) and also broadcasts it
 * as a standalone vision_update WebSocket event so the frontend can render a
 * dedicated realtime AI Vision panel.
 */

export interface VisionDetectedObject {
  /** Human-readable label, e.g. "CHARACTER: Alice" or "PROP: table" */
  label: string
  /** Confidence score in [0, 1] */
  confidence: number
  /** Optional spatial hint such as "foreground left", "background centre" */
  position_hint?: string
}

export type AdjustmentType =
  | 'REFRAME'
  | 'TRACK_SUBJECT'
  | 'ADJUST_ALTITUDE'
  | 'CHANGE_MOVEMENT'
  | 'HOLD_POSITION'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'ABORT_SHOT'

export interface DroneCommandAdjustment {
  /** What kind of flight/camera correction to apply */
  adjustment_type: AdjustmentType | string
  /** Why this adjustment is recommended based on what the drone sees */
  rationale: string
  /** 1 = advisory, 5 = immediate action required */
  urgency: number
}

export interface VisionAnalysis {
  drone_id: string
  drone_name: string
  /** ISO 8601 UTC timestamp */
  timestamp: string
  /** One-sentence description of the current frame */
  scene_description: string
  /** All entities the vision model detected in the current frame */
  detected_objects: VisionDetectedObject[]
  /** Composition quality: 1 (poor) – 10 (excellent) */
  composition_score: number
  /** Highest-priority recommended adjustment, if any */
  recommended_adjustment?: DroneCommandAdjustment
  /** shot_id currently being executed by this drone, if any */
  active_shot_id?: string
}
