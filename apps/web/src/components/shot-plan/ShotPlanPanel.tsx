import type { ShotPlan } from "@ca/shared-types"
import {
  Camera,
  CheckCircle2,
  Clock3,
  Crosshair,
  ExternalLink,
  FileText,
  Radio,
  Sparkles,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

type ShotPlanPanelProps = {
  plan: ShotPlan | null
  activeShotId?: string | null
  onSelectShot?: (shotId: string) => void
}

export function ShotPlanPanel({ plan, activeShotId = null, onSelectShot }: ShotPlanPanelProps) {
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null)
  const shotRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const highlightedShotId = activeShotId ?? selectedShotId

  useEffect(() => {
    if (activeShotId) {
      shotRefs.current[activeShotId]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [activeShotId])

  if (!plan) {
    return (
      <section className="border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
        A shot plan will appear after scene analysis.
      </section>
    )
  }

  const beats = new Map(
    (
      plan as ShotPlan & { cinematic_beats?: { beat_id: string; description: string }[] }
    ).cinematic_beats?.map((beat) => [beat.beat_id, beat]) ?? [],
  )
  return (
    <section className="border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
            03 / Shot plan
          </p>
          <h2 className="mt-1 text-xl font-semibold">Director&apos;s coverage</h2>
        </div>
        <span className="border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
          {plan.shots.length} shots
        </span>
      </div>

      <div className="mt-5 border-l-2 border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Sparkles className="size-4" /> Cinematographer notes
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">
          {plan.cinematographer_notes || "No notes provided."}
        </p>
      </div>

      <ol className="mt-5 max-h-136 space-y-3 overflow-y-auto pr-1">
        {plan.shots.map((shot) => {
          const beat = shot.cinematic_beat_id ? beats.get(shot.cinematic_beat_id) : undefined
          const selected = highlightedShotId === shot.shot_id
          return (
            <li
              key={shot.shot_id}
              ref={(element) => {
                shotRefs.current[shot.shot_id] = element
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedShotId(shot.shot_id)
                  onSelectShot?.(shot.shot_id)
                }}
                onMouseEnter={() => setSelectedShotId(shot.shot_id)}
                onMouseLeave={() => setSelectedShotId(null)}
                className={`w-full border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border/60 bg-background/40 hover:border-primary/60"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-primary">
                    {String(shot.sequence).padStart(2, "0")}
                  </span>
                  <span className="font-semibold">{shot.shot_type.replaceAll("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">
                    / {shot.camera_movement.replaceAll("_", " ")}
                  </span>
                  <span className="ml-auto flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <Clock3 className="size-3" /> {shot.duration_seconds}s
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-1">
                    <Radio className="size-3 text-secondary" /> {shot.drone_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Crosshair className="size-3 text-tertiary" /> {shot.subject}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="size-3 text-primary" /> Shot {shot.sequence}
                  </span>
                </div>
                <p className="mt-3 border-t border-border/50 pt-3 text-sm leading-6 text-foreground/80">
                  {shot.rationale || "No rationale provided"}
                </p>
                {beat && <p className="mt-2 text-xs text-tertiary">Beat: {beat.description}</p>}
              </button>
            </li>
          )
        })}
      </ol>

      {plan.research_sources.length > 0 && (
        <div className="mt-5 border-t border-border/60 pt-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <FileText className="size-4" /> Research references
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {plan.research_sources.map((source) => (
              <div
                key={source.query}
                className="border border-border/60 bg-background/50 p-3 text-xs"
              >
                <span className="text-foreground/80">{source.query}</span>
                <span className="mt-1 block font-mono text-primary">
                  {source.reference_count} references
                </span>
                {source.references?.slice(0, 2).map((reference) => (
                  <a
                    key={reference.url}
                    className="mt-2 block border-t border-border/40 pt-2 text-foreground/70 hover:text-primary"
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="flex items-center gap-1 font-medium">
                      {reference.extracted && <CheckCircle2 className="size-3 text-secondary" />}
                      {reference.title}
                      <ExternalLink className="size-3" />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-muted-foreground">
                      {reference.excerpt}
                    </span>
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-secondary">
            <Sparkles className="size-3" /> Parallel evidence confidence:{" "}
            {Math.round((plan.research_confidence ?? 0) * 100)}%
          </div>
        </div>
      )}

      {plan.research_warning && (
        <div className="mt-5 border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          Research trail degraded: {plan.research_warning}
        </div>
      )}
    </section>
  )
}
