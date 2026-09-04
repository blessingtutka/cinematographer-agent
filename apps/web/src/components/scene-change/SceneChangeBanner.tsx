import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, RefreshCw, RotateCcw, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { DrasticChange } from "@/pages/studio/StudioWorkspace"

type SceneChangeBannerProps = {
  change: DrasticChange
  loading: boolean
  /** Called when the user wants to regenerate the shot plan from scratch */
  onRegenerate: () => void
  /** Called when the user wants to keep editing without regenerating */
  onDismiss: () => void
}

const LEVEL_CONFIG = {
  drastic: {
    icon: Zap,
    border: "border-destructive/50",
    bg: "bg-destructive/8",
    accent: "text-destructive",
    accentBorder: "border-destructive/30",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    title: "Drastic scene change detected",
    body: "The new screenplay diverges significantly from the analysed version. The existing shot plan and coverage may no longer be valid.",
  },
  moderate: {
    icon: AlertTriangle,
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/8",
    accent: "text-yellow-500",
    accentBorder: "border-yellow-500/30",
    badge: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40 dark:text-yellow-400",
    title: "Moderate scene change detected",
    body: "Key passages have changed. The shot plan may be partially misaligned — consider regenerating coverage or reviewing shots manually.",
  },
  minor: {
    icon: RotateCcw,
    border: "border-secondary/40",
    bg: "bg-secondary/5",
    accent: "text-secondary",
    accentBorder: "border-secondary/30",
    badge: "bg-secondary/15 text-secondary border-secondary/40",
    title: "Minor scene edit detected",
    body: "Small changes were made to the text. The existing shot plan should still be valid, but you can regenerate if needed.",
  },
} as const

export function SceneChangeBanner({
  change,
  loading,
  onRegenerate,
  onDismiss,
}: SceneChangeBannerProps) {
  const cfg = LEVEL_CONFIG[change.level]
  const Icon = cfg.icon
  const similarityPct = Math.round(change.similarity * 100)

  return (
    <AnimatePresence>
      <motion.div
        key="scene-change-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        role="alert"
        className={`relative border ${cfg.border} ${cfg.bg} p-4`}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          disabled={loading}
          aria-label="Dismiss warning"
          className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground disabled:opacity-40"
        >
          <X className="size-3.5" />
        </button>

        <div className="flex flex-wrap items-start gap-3 pr-6">
          {/* Icon */}
          <span className={`mt-0.5 shrink-0 ${cfg.accent}`}>
            <Icon className="size-4" />
          </span>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-semibold ${cfg.accent}`}>{cfg.title}</p>
              <span
                className={`border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${cfg.badge}`}
              >
                {change.level}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {similarityPct}% match
              </span>
            </div>

            {/* Body */}
            <p className="text-xs leading-5 text-muted-foreground">{cfg.body}</p>

            {/* Similarity bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                <span>Scene similarity</span>
                <span className="font-mono">{similarityPct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${similarityPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    change.level === "drastic"
                      ? "bg-destructive"
                      : change.level === "moderate"
                        ? "bg-yellow-500"
                        : "bg-secondary"
                  }`}
                />
              </div>
            </div>

            {/* Step-by-step correction guide */}
            <StepGuide level={change.level} />

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                onClick={onRegenerate}
                disabled={loading}
                className="gap-1.5"
              >
                {loading ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {loading ? "Regenerating…" : "Regenerate shot plan"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                disabled={loading}
              >
                Keep current plan
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Step-by-step correction guide — specific to severity level
// ---------------------------------------------------------------------------
const STEPS: Record<DrasticChange["level"], { step: string; action: string }[]> = {
  drastic: [
    { step: "01", action: "Review the new scene text in the Analysis tab" },
    { step: "02", action: "Regenerate the shot plan to reflect the new narrative" },
    { step: "03", action: "Verify drone assignments in Coverage match the new characters" },
    { step: "04", action: "Re-run the simulation to confirm the new coverage" },
  ],
  moderate: [
    { step: "01", action: "Check the Analysis tab for changed beats and emotions" },
    { step: "02", action: "Regenerate or manually adjust shots in Coverage" },
    { step: "03", action: "Re-run the simulation to validate changes" },
  ],
  minor: [
    { step: "01", action: "Verify the Analysis tab reflects your edits" },
    { step: "02", action: "Optionally regenerate the shot plan if key lines changed" },
  ],
}

function StepGuide({ level }: { level: DrasticChange["level"] }) {
  const steps = STEPS[level]
  return (
    <div className="mt-3 space-y-1 border-l-2 border-border/50 pl-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Suggested corrections
      </p>
      {steps.map(({ step, action }) => (
        <div key={step} className="flex items-baseline gap-2 text-xs text-muted-foreground">
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">{step}</span>
          <span>{action}</span>
        </div>
      ))}
    </div>
  )
}
