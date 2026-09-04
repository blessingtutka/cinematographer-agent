import type {
  DroneStatus,
  SceneAnalysis,
  ShotPlan,
  Simulation,
  VisionUpdateEvent,
} from "@ca/shared-types"
import { Check, ChevronRight, ChevronsUpDown, FolderKanban, LoaderCircle, Plus } from "lucide-react"
import { createContext, type ReactNode, useContext, useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSimulationWS } from "@/hooks/use-simulation-ws"
import { useUser } from "@/providers/user.provider"
import { dronesService } from "@/services/drones.service"
import { type Project, type ProjectScene, projectsService } from "@/services/projects.service"
import { scenesService } from "@/services/scenes.service"

// ---------------------------------------------------------------------------
// Similarity helper — cheap Jaccard on word sets, good enough for "drastic
// change" detection without a heavy diff library.
// ---------------------------------------------------------------------------
function wordJaccard(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean))
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean))
  if (setA.size === 0 && setB.size === 0) {
    return 1
  }
  let intersection = 0
  for (const word of setA) {
    if (setB.has(word)) {
      intersection++
    }
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 1 : intersection / union
}

export type DrasticChange = {
  /** Jaccard similarity score: 0 (completely different) → 1 (identical) */
  similarity: number
  /** Severity band */
  level: "minor" | "moderate" | "drastic"
  prevText: string
  nextText: string
}

function classifyChange(similarity: number): DrasticChange["level"] {
  if (similarity >= 0.6) {
    return "minor"
  }
  if (similarity >= 0.3) {
    return "moderate"
  }
  return "drastic"
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
type StudioState = {
  analysis: SceneAnalysis | null
  shotPlan: ShotPlan | null
  drones: DroneStatus[]
  simulation: Simulation | null
  visionMap: Map<string, VisionUpdateEvent>
  loading: boolean
  error: string | null
  /** Set when the re-submitted raw_text diverges significantly from the
   *  existing analysis.  Cleared once the user dismisses or regenerates. */
  drasticChange: DrasticChange | null
  clearDrasticChange: () => void
  analyze: (rawText: string) => Promise<void>
  regenerateShotPlan: () => Promise<void>
  setSimulation: (simulation: Simulation | null) => void
  setError: (error: string | null) => void
  setAnalysis: (analysis: SceneAnalysis) => void
}

const StudioContext = createContext<StudioState | null>(null)

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) {
    throw new Error("useStudio must be used inside StudioWorkspace")
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function buildQS(pid?: string, sid?: string) {
  const p = pid ? `project=${encodeURIComponent(pid)}` : ""
  const s = sid ? `scene=${encodeURIComponent(sid)}` : ""
  const qs = [p, s].filter(Boolean).join("&")
  return qs ? `?${qs}` : ""
}

const RESTORE_TIMEOUT_MS = 10_000

async function withRestoreTimeout<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Scene restore timed out. Please retry.")),
          RESTORE_TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------
export function StudioWorkspace() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projectId = searchParams.get("project") ?? undefined
  const sceneId = searchParams.get("scene") ?? undefined

  // Studio state
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null)
  const [shotPlan, setShotPlan] = useState<ShotPlan | null>(null)
  const [drones, setDrones] = useState<DroneStatus[]>([])
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [visionMap, setVisionMap] = useState(new Map<string, VisionUpdateEvent>())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [drasticChange, setDrasticChange] = useState<DrasticChange | null>(null)

  // Selector data
  const [projects, setProjects] = useState<Project[]>([])
  const [scenes, setScenes] = useState<ProjectScene[]>([])

  const { lastEvent } = useSimulationWS(simulation?.simulation_id, simulation?.state === "RUNNING")
  const { user } = useUser()

  // -- Load projects once --
  useEffect(() => {
    void projectsService
      .list()
      .then(setProjects)
      .catch(() => setError("Projects could not be loaded."))
  }, [])

  // -- Load scenes for selected project --
  useEffect(() => {
    if (!projectId) {
      // Keep the scene menu scoped to the selected project.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScenes([])
      return
    }
    void projectsService
      .listScenes(projectId)
      .then(setScenes)
      .catch(() => setError("Scenes could not be loaded."))
  }, [projectId])

  // -- Restore scene from URL param; navigate straight to analysis --
  useEffect(() => {
    if (!sceneId) {
      return
    }
    // Restore state mirrors an external database request lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestoring(true)
    let active = true
    void (async () => {
      try {
        const nextAnalysis = await withRestoreTimeout(scenesService.get(sceneId))
        if (!active) {
          return
        }
        setAnalysis(nextAnalysis)
        setDrasticChange(null)
        try {
          setShotPlan(await withRestoreTimeout(scenesService.getShotPlan(sceneId)))
        } catch {
          setShotPlan(null)
        }
        try {
          setDrones(await withRestoreTimeout(dronesService.list()))
        } catch {
          setDrones([])
        }
        // Skip the input stage — go straight to analysis
        const qs = buildQS(projectId, sceneId)
        setRestoring(false)
        navigate(`/studio/analysis${qs}`, { replace: true })
      } catch {
        if (active) {
          setError("This scene could not be restored.")
          setRestoring(false)
        }
      } finally {
        if (active) {
          setRestoring(false)
        }
      }
    })()
    return () => {
      active = false
      setRestoring(false)
    }
  }, [sceneId, projectId, navigate])

  // -- Accumulate vision events --
  useEffect(() => {
    if (lastEvent?.type !== "vision_update") {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisionMap((prev) => new Map(prev).set(lastEvent.drone_id, lastEvent))
  }, [lastEvent])

  useEffect(() => {
    if (lastEvent?.type !== "drone_update") {
      return
    }
    // Keep the scene authoritative to the latest server simulation snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrones(lastEvent.drones)
  }, [lastEvent])

  useEffect(() => {
    if (lastEvent?.type !== "state_change") {
      return
    }
    // Mirror the server lifecycle so controls remain accurate after playback ends.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSimulation((current) => (current ? { ...current, state: lastEvent.new_state } : current))
  }, [lastEvent])

  // -- Navigation helpers --

  function changeProject(nextProjectId: string) {
    navigate(`/studio/input?project=${encodeURIComponent(nextProjectId)}`)
    setAnalysis(null)
    setShotPlan(null)
    setDrasticChange(null)
  }

  function changeScene(nextSceneId: string) {
    navigate(`/studio/input${buildQS(projectId, nextSceneId || undefined)}`)
  }

  // -- Core actions --
  async function analyze(rawText: string) {
    if (!projectId) {
      setError("Select a project before analyzing a scene.")
      return
    }

    // Drastic change detection
    if (analysis?.raw_text) {
      const similarity = wordJaccard(analysis.raw_text, rawText)
      if (similarity < 0.6) {
        setDrasticChange({
          similarity,
          level: classifyChange(similarity),
          prevText: analysis.raw_text,
          nextText: rawText,
        })
        // Don't abort — still run the analysis, but show the banner
      } else {
        setDrasticChange(null)
      }
    }

    setLoading(true)
    setError(null)
    setShotPlan(null)
    setVisionMap(new Map())
    try {
      const nextAnalysis = await scenesService.analyze(rawText, undefined, projectId)
      const nextDrones = await dronesService.list().catch(() => [] as DroneStatus[])
      const nextPlan = await scenesService.createShotPlan(nextAnalysis.scene_id).catch(() => null)
      setAnalysis(nextAnalysis)
      setDrones(nextDrones)
      setShotPlan(nextPlan)
      navigate(`/studio/analysis${buildQS(projectId, nextAnalysis.scene_id)}`, { replace: true })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "The scene could not be analyzed.")
    } finally {
      setLoading(false)
    }
  }

  async function regenerateShotPlan() {
    if (!analysis) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const nextPlan = await scenesService.createShotPlan(analysis.scene_id)
      setShotPlan(nextPlan)
      setDrasticChange(null)
      navigate(`/studio/coverage${buildQS(projectId, analysis.scene_id)}`, { replace: true })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Shot plan regeneration failed.")
    } finally {
      setLoading(false)
    }
  }

  function clearDrasticChange() {
    setDrasticChange(null)
  }

  const selectedProject = projects.find((p) => p.project_id === projectId)
  const selectedScene = scenes.find((s) => s.scene_id === sceneId)

  const state: StudioState = {
    analysis,
    shotPlan,
    drones,
    simulation,
    visionMap,
    loading,
    error,
    drasticChange,
    clearDrasticChange,
    analyze,
    regenerateShotPlan,
    setSimulation,
    setError,
    setAnalysis,
  }

  return (
    <StudioContext.Provider value={state}>
      <div className="w-full space-y-6">
        <header className="mb-8 border-b border-border/70 pb-5">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            CA / Control room
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 18
                ? "afternoon"
                : "evening"}
            , {user?.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scene analysis and virtual production overview.
          </p>
        </header>
        {/* ── GCloud-style project / scene selector bar ── */}
        <ProjectSceneBar
          projects={projects}
          scenes={scenes}
          projectId={projectId}
          sceneId={sceneId}
          selectedProject={selectedProject}
          selectedScene={selectedScene}
          analysisTitle={analysis?.title}
          onChangeProject={changeProject}
          onChangeScene={changeScene}
        />

        {(error || restoring) && (
          <div
            className={`flex items-center gap-2 border p-3 text-sm ${error ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-primary/30 bg-primary/5 text-muted-foreground"}`}
            role={error ? "alert" : "status"}
          >
            {restoring && <LoaderCircle className="size-4 animate-spin" />}
            <span>{restoring ? "Loading saved scene data…" : error}</span>
            {error && (
              <button
                type="button"
                className="ml-auto text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* ── Stage navigation tabs ── */}
        <nav
          className="flex flex-wrap gap-2 border-b border-border/60 pb-3"
          aria-label="Studio stages"
        >
          {(
            [
              ["input", "01 Input"],
              ["analysis", "02 Analysis"],
              ["coverage", "03 Coverage"],
              ["simulation", "04 Simulation"],
            ] as const
          ).map(([to, label]) => {
            const complete =
              to === "analysis"
                ? Boolean(analysis)
                : to === "coverage"
                  ? Boolean(shotPlan)
                  : to === "simulation"
                    ? Boolean(simulation)
                    : false
            return (
              <NavLink
                key={to}
                to={`/studio/${to}${window.location.search}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`
                }
              >
                <span>{label}</span>
                {complete && <Check className="size-3.5" aria-label={`${label} complete`} />}
              </NavLink>
            )
          })}
        </nav>

        <Outlet />
      </div>
    </StudioContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Google-Cloud-style project / scene breadcrumb selector
// ---------------------------------------------------------------------------
type ProjectSceneBarProps = {
  projects: Project[]
  scenes: ProjectScene[]
  projectId?: string
  sceneId?: string
  selectedProject?: Project
  selectedScene?: ProjectScene
  analysisTitle?: string
  onChangeProject: (id: string) => void
  onChangeScene: (id: string) => void
}

function ProjectSceneBar({
  projects,
  scenes,
  projectId,
  sceneId,
  selectedProject,
  selectedScene,
  analysisTitle,
  onChangeProject,
  onChangeScene,
}: ProjectSceneBarProps) {
  const sceneName = analysisTitle ?? selectedScene?.title

  return (
    <div className="flex flex-wrap items-center gap-1 border border-border/70 bg-card/80 px-3 py-2 shadow-sm backdrop-blur">
      {/* Brand / context label */}
      <span className="mr-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
        <FolderKanban className="size-3.5" />
        CA
      </span>

      <ChevronRight className="size-3.5 shrink-0 text-border" />

      {/* Project selector */}
      <SelectorDropdown
        placeholder="Select project"
        value={projectId ?? ""}
        label={selectedProject?.title}
        emptyLabel="No projects yet"
        options={projects.map((p) => ({ value: p.project_id, label: p.title }))}
        onSelect={onChangeProject}
        required
      />

      {projectId && (
        <>
          <ChevronRight className="size-3.5 shrink-0 text-border" />
          {/* Scene selector */}
          <SelectorDropdown
            placeholder="New scene"
            value={sceneId ?? ""}
            label={sceneName}
            emptyLabel="No scenes yet"
            options={scenes.map((s) => ({ value: s.scene_id, label: s.title }))}
            onSelect={onChangeScene}
            onSelectNew={() => onChangeScene("")}
          />
        </>
      )}

      {/* Right side: quick-link to Projects page */}
      <NavLink
        to="/projects"
        className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
      >
        <Plus className="size-3.5" />
        New project
      </NavLink>
    </div>
  )
}

// Shadcn dropdown styled as a compact GCloud context switcher.
type SelectorDropdownProps = {
  placeholder: string
  value: string
  label?: string
  emptyLabel: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
  onSelectNew?: () => void
  required?: boolean
}

function SelectorDropdown({
  placeholder,
  value,
  label,
  emptyLabel,
  options,
  onSelect,
  onSelectNew,
  required,
}: SelectorDropdownProps) {
  const isEmpty = options.length === 0
  const displayLabel = label ?? (value ? value.slice(0, 8) : placeholder)
  const isPlaceholder = !value

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isEmpty}
        aria-label={placeholder}
        className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          isPlaceholder
            ? required
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-dashed border-border/70 text-muted-foreground"
            : "border-primary/30 bg-primary/8 text-foreground"
        }`}
      >
        {isEmpty ? emptyLabel : displayLabel}
        <ChevronsUpDown className="size-3 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {onSelectNew && (
          <>
            <DropdownMenuItem onSelect={onSelectNew}>
              <Plus className="size-3.5" />
              New scene
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onSelect(option.value)}
            className={option.value === value ? "bg-accent" : undefined}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Shared stage wrapper
// ---------------------------------------------------------------------------
export function StudioStage({ children }: { children: ReactNode }) {
  return <div className="min-h-112">{children}</div>
}
