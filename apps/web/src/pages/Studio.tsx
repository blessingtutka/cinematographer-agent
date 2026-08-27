import type { SceneAnalysis, ShotPlan } from "@ca/shared-types"
import { useState } from "react"
import { Link } from "react-router-dom"

import { SceneAnalysisPanel } from "@/components/scene-analysis/SceneAnalysisPanel"
import { SceneInputPanel } from "@/components/scene-input/SceneInputPanel"
import { ShotPlanPanel } from "@/components/shot-plan/ShotPlanPanel"
import { Button } from "@/components/ui/button"
import { analyzeScene, getShotPlan } from "@/lib/api-client"
import { useUser } from "@/providers/user.provider"

function Studio() {
  const { user, signOut } = useUser()
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null)
  const [shotPlan, setShotPlan] = useState<ShotPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeShotId, setActiveShotId] = useState<string | null>(null)

  async function handleAnalyze(rawText: string) {
    setLoading(true)
    setError(null)
    setShotPlan(null)
    try {
      const nextAnalysis = await analyzeScene(rawText)
      setAnalysis(nextAnalysis)
      setShotPlan(await getShotPlan(nextAnalysis.scene_id))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "The scene could not be analyzed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mesh-bg min-h-screen bg-background px-4 pb-12 pt-24 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
              CA / Control room
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Good evening, {user?.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn a scene into a considered camera plan.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/">Back home</Link>
            </Button>
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <SceneInputPanel onSubmit={handleAnalyze} loading={loading} apiError={error} />
            <SceneAnalysisPanel analysis={analysis} />
          </div>
          <ShotPlanPanel
            plan={shotPlan}
            activeShotId={activeShotId}
            onSelectShot={setActiveShotId}
          />
        </div>
      </div>
    </main>
  )
}

export default Studio
