import type { VisionUpdateEvent } from "@ca/shared-types"
import { AlertTriangle, Bot, Eye, Layers, Scan } from "lucide-react"
import { useEffect, useRef } from "react"

type VisionOverlayPanelProps = {
  /** Map of drone_id → latest VisionUpdateEvent for that drone */
  visionMap: Map<string, VisionUpdateEvent>
  /** drone_id of the currently-selected camera feed, if any */
  activeDroneId?: string
}

export function VisionOverlayPanel({ visionMap, activeDroneId }: VisionOverlayPanelProps) {
  const isEmpty = visionMap.size === 0

  if (isEmpty) {
    return (
      <section className="border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
          06 / AI Vision
        </p>
        <p className="mt-3">Realtime vision analysis will appear once a simulation is running.</p>
      </section>
    )
  }

  // Show the active drone first; fall back to the first entry
  const entries = [...visionMap.entries()]
  const sorted = activeDroneId
    ? [
        ...entries.filter(([id]) => id === activeDroneId),
        ...entries.filter(([id]) => id !== activeDroneId),
      ]
    : entries

  return (
    <section className="border border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            06 / AI Vision
          </p>
          <h2 className="mt-1 text-xl font-semibold">Realtime analysis</h2>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-xs text-primary">
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
          LIVE
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {sorted.map(([droneId, event]) => (
          <DroneVisionCard key={droneId} event={event} isActive={droneId === activeDroneId} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Per-drone vision card
// ---------------------------------------------------------------------------

function DroneVisionCard({ event, isActive }: { event: VisionUpdateEvent; isActive: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Scroll active drone into view when it changes
  useEffect(() => {
    if (isActive) {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [isActive])

  const urgencyLevel = event.recommended_adjustment?.urgency ?? 0
  const hasAdjustment = !!event.recommended_adjustment

  return (
    <div
      ref={cardRef}
      className={`p-5 transition-colors ${
        isActive ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground">
          <Eye className="size-3.5" />
          CAM {event.drone_name}
        </span>
        <CompositionBadge score={event.composition_score} />
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>

      {/* Scene description — the "what the drone sees" sentence */}
      <p className="mt-3 text-sm leading-6 text-foreground/90">{event.scene_description}</p>

      {/* Detected objects */}
      {event.detected_objects.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Scan className="size-3.5" />
            Detected
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {event.detected_objects.map((obj, i) => (
              <DetectedObjectChip
                key={i}
                label={obj.label}
                confidence={obj.confidence}
                hint={obj.position_hint}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Composition score bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5" />
            Composition
          </span>
          <span className="font-mono font-semibold text-foreground">
            {event.composition_score}/10
          </span>
        </div>
        <CompositionBar score={event.composition_score} />
      </div>

      {/* AI-recommended adjustment */}
      {hasAdjustment && event.recommended_adjustment && (
        <AdjustmentBanner adjustment={event.recommended_adjustment} urgency={urgencyLevel} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CompositionBadge({ score }: { score: number }) {
  const { label, classes } = scoreAppearance(score)
  return (
    <span className={`border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${classes}`}>
      {label}
    </span>
  )
}

function CompositionBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const { barColor } = scoreAppearance(score)
  return (
    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function DetectedObjectChip({
  label,
  confidence,
  hint,
}: {
  label: string
  confidence: number
  hint?: string
}) {
  const [type, name] = label.includes(":") ? label.split(":").map((s) => s.trim()) : ["", label]
  const typeColor = objectTypeColor(type)

  return (
    <li
      title={
        hint
          ? `${hint} · ${(confidence * 100).toFixed(0)}% confidence`
          : `${(confidence * 100).toFixed(0)}% confidence`
      }
      className={`flex items-center gap-1 border px-2 py-1 text-xs ${typeColor}`}
    >
      <span className="font-semibold">{name}</span>
      {hint && <span className="text-[10px] text-muted-foreground/70">· {hint}</span>}
      <span className="ml-1 font-mono text-[10px] opacity-60">
        {(confidence * 100).toFixed(0)}%
      </span>
    </li>
  )
}

function AdjustmentBanner({
  adjustment,
  urgency,
}: {
  adjustment: { adjustment_type: string; rationale: string; urgency: number }
  urgency: number
}) {
  const isUrgent = urgency >= 4
  return (
    <div
      className={`mt-4 border-l-2 p-3 text-xs ${
        isUrgent ? "border-destructive bg-destructive/10" : "border-secondary bg-secondary/10"
      }`}
    >
      <div className="flex items-center gap-1.5 font-semibold uppercase tracking-widest">
        {isUrgent ? (
          <AlertTriangle className="size-3.5 text-destructive" />
        ) : (
          <Bot className="size-3.5 text-secondary" />
        )}
        <span className={isUrgent ? "text-destructive" : "text-secondary"}>
          {adjustment.adjustment_type.replaceAll("_", " ")}
        </span>
        <UrgencyPips urgency={urgency} />
      </div>
      <p className="mt-1.5 leading-5 text-foreground/80">{adjustment.rationale}</p>
    </div>
  )
}

function UrgencyPips({ urgency }: { urgency: number }) {
  return (
    <span className="ml-auto flex items-center gap-0.5" title={`Urgency ${urgency}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`inline-block size-1.5 rounded-full ${
            i < urgency ? "bg-current opacity-90" : "bg-current opacity-20"
          }`}
        />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreAppearance(score: number): {
  label: string
  classes: string
  barColor: string
} {
  if (score >= 8) {
    return {
      label: "Excellent",
      classes: "border-primary/40 bg-primary/10 text-primary",
      barColor: "bg-primary",
    }
  }
  if (score >= 6) {
    return {
      label: "Good",
      classes: "border-secondary/40 bg-secondary/10 text-secondary",
      barColor: "bg-secondary",
    }
  }
  if (score >= 4) {
    return {
      label: "Fair",
      classes: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
      barColor: "bg-yellow-500",
    }
  }
  return {
    label: "Poor",
    classes: "border-destructive/40 bg-destructive/10 text-destructive",
    barColor: "bg-destructive",
  }
}

function objectTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case "CHARACTER":
      return "border-secondary/40 bg-secondary/10 text-secondary"
    case "PROP":
      return "border-tertiary/40 bg-tertiary/10 text-tertiary"
    case "LIGHT":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
    case "HAZARD":
      return "border-destructive/40 bg-destructive/10 text-destructive"
    default:
      return "border-border/60 bg-background/50 text-muted-foreground"
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}
