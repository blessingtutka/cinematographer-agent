/**
 * shot-plan.ts — Types for the shot plan produced by the Cinematographer_Agent.
 */

export type ShotType =
  | 'WIDE'
  | 'MEDIUM'
  | 'CLOSE_UP'
  | 'EXTREME_CLOSE_UP'
  | 'OVER_SHOULDER'
  | 'LOW_ANGLE'
  | 'HIGH_ANGLE'

export type CameraMovement =
  | 'STATIC'
  | 'MOVE_TO'
  | 'DOLLY_IN'
  | 'DOLLY_OUT'
  | 'TRACK'
  | 'FOLLOW'
  | 'ORBIT'
  | 'PAN'
  | 'TILT'

export interface Shot {
  shot_id: string
  /** 1-based, strictly increasing within a ShotPlan */
  sequence: number
  shot_type: ShotType
  camera_movement: CameraMovement
  /** Name of the drone assigned to execute this shot */
  drone_name: string
  /** Description of the primary subject of the shot */
  subject: string
  /** Duration in seconds; must be > 0 */
  duration_seconds: number
  /** Cinematographic rationale; length in [1, 500] */
  rationale: string
  /** Optional reference to a CinematicBeat.beat_id */
  cinematic_beat_id?: string
}

export interface ResearchSource {
  /** The search query that produced these results */
  query: string
  /** Number of references found for this query */
  reference_count: number
}

export interface ShotPlan {
  plan_id: string
  /** References a SceneAnalysis.scene_id */
  scene_id: string
  /** Ordered list of shots; length in [1, 20] */
  shots: Shot[]
  research_sources: ResearchSource[]
  /** Present when research data was unavailable or degraded */
  research_warning?: string
  /** Overall notes from the Cinematographer_Agent */
  cinematographer_notes: string
}
