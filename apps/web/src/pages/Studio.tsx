import type {
  DroneStatus,
  SceneAnalysis,
  ShotPlan,
  Simulation,
  VisionUpdateEvent,
} from "@ca/shared-types"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { CameraFeedsPanel } from "@/components/camera-feeds/CameraFeedsPanel"
import { ControlBar } from "@/components/control-bar/ControlBar"
import { DirectorViewPanel } from "@/components/director-view/DirectorViewPanel"
import { SceneAnalysisPanel } from "@/components/scene-analysis/SceneAnalysisPanel"
import { SceneInputPanel } from "@/components/scene-input/SceneInputPanel"
import { ShotPlanPanel } from "@/components/shot-plan/ShotPlanPanel"
import { VisionOverlayPanel } from "@/components/vision-overlay/VisionOverlayPanel"
import { useSimulationWS } from "@/hooks/use-simulation-ws"
import { useUser } from "@/providers/user.provider"
import { dronesService } from "@/services/drones.service"
import { scenesService } from "@/services/scenes.service"

function Studio() {
  const { user } = useUser()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("project") ?? undefined

  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null)
  const [shotPlan, setShotPlan] = useState<ShotPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeShotId, setActiveShotId] = useState<string | null>(null)
  const [drones, setDrones] = useState<DroneStatus[]>([])
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  // Map of drone_id → most recent VisionUpdateEvent received via WebSocket
  const [visionMap, setVisionMap] = useState<Map<string, VisionUpdateEvent>>(new Map())

  async function handleAnalyze(rawText: string) {
    setLoading(true)
    setError(null)
    setShotPlan(null)
    setVisionMap(new Map())
    try {
      const nextAnalysis = await scenesService.analyze(rawText, undefined, projectId)
      setAnalysis(nextAnalysis)
      setDrones(await dronesService.list())
      setShotPlan(await scenesService.createShotPlan(nextAnalysis.scene_id))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "The scene could not be analyzed.")
    } finally {
      setLoading(false)
    }
  }

  const { lastEvent } = useSimulationWS(simulation?.simulation_id, simulation?.state === "RUNNING")
  const liveDrones = lastEvent?.type === "drone_update" ? lastEvent.drones : drones

  // Accumulate the latest vision analysis per drone; runs as a side-effect so
  // we never call setState during render.
  useEffect(() => {
    if (lastEvent?.type === "vision_update") {
      const event = lastEvent
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisionMap((prev) => {
        const next = new Map(prev)
        next.set(event.drone_id, event)
        return next
      })
    }
  }, [lastEvent])

  // Derive the active drone from the first recording drone, for vision highlighting
  const activeDroneId = liveDrones.find((d) => d.is_recording)?.drone_id

  return (
    <div className="w-full h-full">
      <header className="mb-8 border-b border-border/70 pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          CA / Control room
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Good evening, {user?.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scene analysis and virtual production overview.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div id="scene-input" className="scroll-mt-20">
            <SceneInputPanel onSubmit={handleAnalyze} loading={loading} apiError={error} />
          </div>
          <div id="scene-analysis" className="scroll-mt-20">
            <SceneAnalysisPanel analysis={analysis} />
          </div>
        </div>
        <div id="shot-plan" className="scroll-mt-20">
          <ShotPlanPanel
            plan={shotPlan}
            activeShotId={activeShotId}
            onSelectShot={setActiveShotId}
          />
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div id="director-view" className="scroll-mt-20">
          <DirectorViewPanel
            drones={liveDrones}
            analysis={analysis}
            plan={shotPlan}
            paused={simulation?.state === "PAUSED"}
          />
        </div>
        <div id="camera-feeds" className="scroll-mt-20">
          <CameraFeedsPanel drones={liveDrones} />
        </div>
        <div id="vision-overlay" className="scroll-mt-20">
          <VisionOverlayPanel visionMap={visionMap} activeDroneId={activeDroneId} />
        </div>
      </div>
      <div className="mt-5" id="simulation-controls">
        <ControlBar
          sceneId={analysis?.scene_id}
          droneIds={drones.map((drone) => drone.drone_id)}
          hasSelectedDrone={drones.length > 0}
          simulation={simulation}
          onChange={setSimulation}
          onError={setError}
        />
      </div>
    </div>
  )
}

export default Studio
