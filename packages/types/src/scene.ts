/**
 * scene.ts — Types for scene analysis produced by the Scene_Analyzer agent.
 */

export type EmotionalTone =
  "NEUTRAL" | "TENSE" | "ROMANTIC" | "MELANCHOLIC" | "JOYFUL" | "FEARFUL" | "ANGRY"

export interface Character {
  character_id: string
  display_name: string
  /** Initial 3D position in the scene */
  initial_position: {
    x: number
    y: number
    z: number
  }
}

export interface Action {
  action_id: string
  /** References a Character.character_id in the same SceneAnalysis */
  character_id: string
  description: string
  /** Seconds offset from scene start */
  timestamp_offset: number
}

export interface CinematicBeat {
  beat_id: string
  description: string
  /** Seconds offset from scene start; non-negative */
  timestamp_offset: number
  /** Importance score, integer in [1, 10] */
  significance_score: number
}

export interface DialogueLine {
  line_id: string
  /** References a Character.character_id in the same SceneAnalysis */
  description: string
  character_id: string
  text: string
  /** Normalised position within the narrative, in [0, 1] */
  narrative_position: number
}

export interface SceneAnalysis {
  scene_id: string
  title: string
  description: string
  raw_text: string
  characters: Character[]
  actions: Action[]
  emotions: EmotionalTone[]
  cinematic_beats: CinematicBeat[]
  dialogue: DialogueLine[]
  style_reference?: string | null
}
