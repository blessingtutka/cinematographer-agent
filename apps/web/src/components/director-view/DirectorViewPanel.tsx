import type { DroneStatus, SceneAnalysis, ShotPlan } from "@ca/shared-types"
import { OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"

import { StageScene } from "@/components/stage/StageScene"

type DirectorViewPanelProps = {
  drones: DroneStatus[]
  analysis: SceneAnalysis | null
  plan: ShotPlan | null
  paused?: boolean
}

export function DirectorViewPanel({
  drones,
  analysis,
  plan,
  paused = false,
}: DirectorViewPanelProps) {
  return (
    <section className="overflow-hidden border border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">
            04 / Director view
          </p>
          <h2 className="mt-1 text-xl font-semibold">Digital stage</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {paused ? "FROZEN" : "LIVE PREVIEW"}
        </span>
      </div>
      <div className="h-108 bg-slate-950 ring-1 ring-inset ring-white/10">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 7, 10], fov: 42 }}>
          <color attach="background" args={["#080b12"]} />
          <fog attach="fog" args={["#080b12", 12, 32]} />
          <ambientLight intensity={0.7} />
          <directionalLight
            castShadow
            position={[4, 9, 5]}
            intensity={2.4}
            color="#f6e7c1"
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-6, 3, 2]} intensity={12} distance={14} color="#38bdf8" />
          <StageScene drones={drones} analysis={analysis} plan={plan} paused={paused} />
          <OrbitControls
            makeDefault
            enableDamping
            minDistance={5}
            maxDistance={26}
            target={[0, 1, -1]}
          />
        </Canvas>
      </div>
    </section>
  )
}
