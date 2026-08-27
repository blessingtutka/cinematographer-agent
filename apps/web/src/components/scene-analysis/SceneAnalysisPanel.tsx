import type { SceneAnalysis } from "@ca/shared-types"
import { Activity, Drama, MessageSquare, Users } from "lucide-react"

type SceneAnalysisPanelProps = {
  analysis: SceneAnalysis | null
}

export function SceneAnalysisPanel({ analysis }: SceneAnalysisPanelProps) {
  if (!analysis) {
    return <EmptyAnalysis />
  }

  const characterNames = new Map(
    analysis.characters.map((character) => [character.character_id, character.display_name]),
  )
  return (
    <section className="border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
            02 / Analysis
          </p>
          <h2 className="mt-1 text-xl font-semibold">{analysis.title}</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {analysis.scene_id.slice(0, 8)}
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <AnalysisGroup icon={<Users />} label="Characters">
          {analysis.characters.map((character) => (
            <li
              key={character.character_id}
              className="flex justify-between gap-3 border-b border-border/50 py-2 text-sm last:border-0"
            >
              <span>{character.display_name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {character.initial_position.x.toFixed(1)}, {character.initial_position.z.toFixed(1)}
              </span>
            </li>
          ))}
        </AnalysisGroup>
        <AnalysisGroup icon={<Drama />} label="Emotional tone">
          <div className="flex flex-wrap gap-2 pt-2">
            {analysis.emotions.map((emotion) => (
              <span
                key={emotion}
                className="border border-secondary/40 bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary"
              >
                {emotion}
              </span>
            ))}
          </div>
        </AnalysisGroup>
        <AnalysisGroup icon={<Activity />} label="Cinematic beats">
          {analysis.cinematic_beats.map((beat) => (
            <li key={beat.beat_id} className="border-b border-border/50 py-2 last:border-0">
              <div className="flex justify-between gap-3 text-sm">
                <span>{beat.description}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {beat.timestamp_offset.toFixed(1)}s
                </span>
              </div>
              <div className="mt-1 text-xs text-primary">
                Significance {beat.significance_score}/10
              </div>
            </li>
          ))}
        </AnalysisGroup>
        <AnalysisGroup icon={<MessageSquare />} label="Dialogue">
          {analysis.dialogue.map((line) => (
            <li key={line.line_id} className="border-b border-border/50 py-2 last:border-0 text-sm">
              <span className="font-semibold text-primary">
                {characterNames.get(line.character_id) ?? "Unknown"}
              </span>
              <span className="text-muted-foreground"> · {line.text}</span>
            </li>
          ))}
        </AnalysisGroup>
      </div>
    </section>
  )
}

function AnalysisGroup({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <ul className="mt-2">{children}</ul>
    </div>
  )
}

function EmptyAnalysis() {
  return (
    <section className="border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
      Scene analysis will appear here after submission.
    </section>
  )
}
