import { AnimatePresence, motion } from "framer-motion"
import { Check, CheckCircle2, ChevronRight, Film, FolderOpen, Radio, RefreshCw } from "lucide-react"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { CameraFeedsPanel } from "@/components/camera-feeds/CameraFeedsPanel"
import { ControlBar } from "@/components/control-bar/ControlBar"
import { DirectorViewPanel } from "@/components/director-view/DirectorViewPanel"
import { SceneAnalysisPanel } from "@/components/scene-analysis/SceneAnalysisPanel"
import { SceneChangeBanner } from "@/components/scene-change/SceneChangeBanner"
import { SceneInputPanel } from "@/components/scene-input/SceneInputPanel"
import { ShotPlanPanel } from "@/components/shot-plan/ShotPlanPanel"
import { Button } from "@/components/ui/button"
import { VisionOverlayPanel } from "@/components/vision-overlay/VisionOverlayPanel"
import { scenesService } from "@/services/scenes.service"

import { StudioStage, useStudio } from "./StudioWorkspace"

// ---------------------------------------------------------------------------
// 01 Input
// ---------------------------------------------------------------------------
export function StudioInput() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get("project") ?? undefined
  const sceneId = searchParams.get("scene") ?? undefined

  const {
    analyze,
    loading,
    error,
    analysis,
    drasticChange,
    clearDrasticChange,
    regenerateShotPlan,
  } = useStudio()

  // When an existing scene is loaded (sceneId present), we don't show the
  // raw input form — the user is in "update" mode, handled in Analysis tab.
  const isExistingScene = !!sceneId && !!analysis

  return (
    <StudioStage>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <Film className="size-5 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Start a take</p>
            <h2 className="text-xl font-semibold">Bring in the scene</h2>
          </div>
        </div>

        {/* Project required guard */}
        {!projectId && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 border border-destructive/40 bg-destructive/5 p-4 text-sm"
          >
            <FolderOpen className="size-4 shrink-0 text-destructive" />
            <span className="text-destructive">
              Select a project from the bar above before analyzing a new scene.
            </span>
          </motion.div>
        )}

        {/* Drastic change banner — shown when a re-analysis diverged significantly */}
        {drasticChange && (
          <SceneChangeBanner
            change={drasticChange}
            loading={loading}
            onRegenerate={() => void regenerateShotPlan()}
            onDismiss={clearDrasticChange}
          />
        )}

        {/* Existing scene: show a summary card instead of a blank textarea */}
        {isExistingScene ? (
          <ExistingSceneCard
            title={analysis.title}
            description={analysis.description}
            rawText={analysis.raw_text}
          />
        ) : (
          <SceneInputPanel
            onSubmit={analyze}
            loading={loading}
            apiError={!projectId ? null : error}
          />
        )}

        {/* Success nudge after analysis */}
        <AnimatePresence>
          {analysis && !drasticChange && (
            <motion.p
              key="success-nudge"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              Scene captured — continue to Analysis to inspect the breakdown.
              <ChevronRight className="ml-auto size-4 opacity-50" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </StudioStage>
  )
}

// ---------------------------------------------------------------------------
// 02 Drones
// ---------------------------------------------------------------------------
export function StudioDrones() {
  const navigate = useNavigate()
  const { analysis, drones, selectedDroneIds, setSelectedDroneIds, setShotPlan, setError } =
    useStudio()
  const [loading, setLoading] = useState(false)

  function toggleDrone(droneId: string) {
    if (selectedDroneIds.includes(droneId)) {
      setSelectedDroneIds(selectedDroneIds.filter((id) => id !== droneId))
      return
    }
    if (selectedDroneIds.length >= 3) {
      setError("Select up to three drones for a scene.")
      return
    }
    setSelectedDroneIds([...selectedDroneIds, droneId])
  }

  async function continueToAnalysis() {
    if (!analysis || selectedDroneIds.length === 0) {
      setError("Select at least one drone before continuing.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      setShotPlan(await scenesService.createShotPlan(analysis.scene_id, selectedDroneIds))
      navigate(`/studio/analysis${window.location.search}`, { replace: true })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not create the shot plan.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudioStage>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="border border-border/70 bg-card/60 p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            02 / Scene fleet
          </p>
          <h2 className="mt-2 text-xl font-semibold">Choose up to three cameras</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fleet registration and Bluetooth pairing live in the Drones page. Choose the aircraft
            for this scene here.
          </p>
          <div className="mt-5 grid gap-2">
            {drones.map((drone) => {
              const selected = selectedDroneIds.includes(drone.drone_id)
              return (
                <button
                  key={drone.drone_id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleDrone(drone.drone_id)}
                  className={`flex items-center gap-3 border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"}`}
                >
                  <span
                    className={`flex size-7 items-center justify-center border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}
                  >
                    <Check className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{drone.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {drone.online ? "Online and ready" : "Offline · pair from Drones"}
                    </span>
                  </span>
                  <span
                    className={`size-2 rounded-full ${drone.online ? "bg-emerald-400" : "bg-muted-foreground/30"}`}
                  />
                </button>
              )
            })}
          </div>
          {drones.length === 0 && (
            <p className="mt-5 text-sm text-muted-foreground">
              No registered drones. Open Drones from the sidebar to add one.
            </p>
          )}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <span className="text-xs text-muted-foreground">
              {selectedDroneIds.length}/3 selected
            </span>
            <Button
              type="button"
              disabled={loading || selectedDroneIds.length === 0 || !analysis}
              onClick={() => void continueToAnalysis()}
            >
              {loading ? "Preparing…" : "Continue to analysis"}
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </StudioStage>
  )
}

// Card shown instead of the text input when an existing scene is open
function ExistingSceneCard({
  title,
  description,
  rawText,
}: {
  title: string
  description?: string
  rawText: string
}) {
  return (
    <div className="space-y-3 border border-border/70 bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Film className="size-4 text-secondary" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Loaded scene
        </p>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
      <div className="border-t border-border/50 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Screenplay excerpt
        </p>
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{rawText}</p>
      </div>
      <p className="text-xs text-muted-foreground/60">
        Switch to the Analysis tab to edit this scene or update the brief.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 02 Analysis
// ---------------------------------------------------------------------------
export function StudioAnalysis() {
  const {
    analysis,
    setAnalysis,
    loading,
    setError,
    drasticChange,
    clearDrasticChange,
    regenerateShotPlan,
  } = useStudio()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!analysis) {
    return (
      <StudioStage>
        <SceneAnalysisPanel analysis={null} />
      </StudioStage>
    )
  }

  async function saveBrief(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (!analysis) {
      return
    }
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const nextAnalysis = await scenesService.update(analysis.scene_id, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        raw_text: String(form.get("raw_text") ?? ""),
      })
      setAnalysis(nextAnalysis)
      setSaved(true)
    } catch {
      setSaveError("Could not save changes. Please try again.")
      setError("Could not save changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <StudioStage>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Drastic change banner */}
        {drasticChange && (
          <SceneChangeBanner
            change={drasticChange}
            loading={loading}
            onRegenerate={() => void regenerateShotPlan()}
            onDismiss={clearDrasticChange}
          />
        )}

        {/* Editable brief form */}
        <form onSubmit={saveBrief} className="grid gap-4 border border-border/70 bg-card/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Scene brief
            </p>
            <span className="text-xs text-muted-foreground/60">
              {saved ? "✓ Saved" : "AI-generated · editable"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Title
              <input
                name="title"
                defaultValue={analysis.title}
                maxLength={200}
                className="border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Description
              <input
                name="description"
                defaultValue={analysis.description}
                maxLength={500}
                className="border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Scene text
            <textarea
              name="raw_text"
              defaultValue={analysis.raw_text}
              rows={6}
              className="border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {saveError && <p className="text-xs text-destructive">{saveError}</p>}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="submit" disabled={saving} size="sm">
              {saving ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>

        <SceneAnalysisPanel analysis={analysis} />
      </div>
    </StudioStage>
  )
}

// ---------------------------------------------------------------------------
// 03 Coverage
// ---------------------------------------------------------------------------
export function StudioCoverage() {
  const { shotPlan, loading, regenerateShotPlan, drasticChange, clearDrasticChange } = useStudio()
  const [activeShotId, setActiveShotId] = useState<string | null>(null)

  return (
    <StudioStage>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Drastic change banner in Coverage too — shots may be stale */}
        {drasticChange && (
          <SceneChangeBanner
            change={drasticChange}
            loading={loading}
            onRegenerate={() => void regenerateShotPlan()}
            onDismiss={clearDrasticChange}
          />
        )}
        <ShotPlanPanel plan={shotPlan} activeShotId={activeShotId} onSelectShot={setActiveShotId} />
      </div>
    </StudioStage>
  )
}

// ---------------------------------------------------------------------------
// 04 Simulation
// ---------------------------------------------------------------------------
export function StudioSimulation() {
  const {
    analysis,
    shotPlan,
    drones,
    selectedDroneIds,
    simulation,
    setSimulation,
    setError,
    visionMap,
  } = useStudio()

  const liveDrones = drones
  const activeDroneId = liveDrones.find((drone) => drone.is_recording)?.drone_id

  return (
    <StudioStage>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Radio className="size-5 text-secondary" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Virtual production
            </p>
            <h2 className="text-xl font-semibold">Run the stage</h2>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
          <DirectorViewPanel
            drones={liveDrones}
            analysis={analysis}
            plan={shotPlan}
            paused={simulation?.state === "PAUSED"}
          />
          <div className="space-y-5">
            <ControlBar
              sceneId={analysis?.scene_id}
              droneIds={selectedDroneIds}
              allDronesOnline={
                selectedDroneIds.length > 0 &&
                selectedDroneIds.every(
                  (id) => drones.find((drone) => drone.drone_id === id)?.online === true,
                )
              }
              simulation={simulation}
              onChange={setSimulation}
              onError={setError}
            />
            <CameraFeedsPanel drones={liveDrones} />
            <VisionOverlayPanel visionMap={visionMap} activeDroneId={activeDroneId} />
          </div>
        </div>
      </div>
    </StudioStage>
  )
}
