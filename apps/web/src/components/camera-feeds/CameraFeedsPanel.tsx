import type { DroneStatus, SceneAnalysis, ShotPlan } from "@ca/shared-types"
import { PerspectiveCamera } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Vector3 } from "three"

import { StageScene } from "@/components/stage/StageScene"

type CameraFeedsPanelProps = {
  drones: DroneStatus[]
  selectedDroneId?: string
  analysis?: SceneAnalysis | null
  plan?: ShotPlan | null
  paused?: boolean
}

export function CameraFeedsPanel({
  drones,
  selectedDroneId,
  analysis,
  plan,
  paused,
}: CameraFeedsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(drones[0]?.drone_id)
  const [searchParams] = useSearchParams()
  const requestedId = selectedDroneId ?? searchParams.get("drone") ?? undefined
  const selected =
    drones.find((drone) => drone.drone_id === requestedId || drone.drone_id === selectedId) ??
    drones[0]

  return (
    <section className="overflow-hidden border border-border/70 bg-card/80 shadow-sm backdrop-blur">
      <div className="border-b border-border/60 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
          05 / Camera feeds
        </p>
        <h2 className="mt-1 text-xl font-semibold">First-person monitors</h2>
      </div>
      <div className="min-w-0 p-4">
        <div className="relative min-w-0 aspect-video min-h-80 overflow-hidden bg-slate-950 ring-1 ring-inset ring-white/10 sm:min-h-96">
          {selected ? (
            <RealCameraOrSimulation
              key={selected.drone_id}
              drone={selected}
              drones={drones}
              analysis={analysis}
              plan={plan}
              paused={paused}
            />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-slate-500">
              NO SIGNAL
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-linear-to-b from-slate-950/90 to-transparent px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-slate-100">
            <span className="shrink-0 text-emerald-300">
              {selected?.is_recording ? "REC" : "READY"}
            </span>
            <span className="truncate text-right">CAM / {selected?.name ?? "NO CAMERA"}</span>
          </div>
        </div>
        <div className="mt-3 grid gap-1 border border-border/60 bg-background/50 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {selected?.active_shot
              ? `${selected.active_shot.shot_type} / ${selected.active_shot.camera_movement}`
              : "Standby"}
          </p>
          <p className="whitespace-normal break-words text-sm leading-6 text-foreground">
            {selected?.active_shot?.subject ?? "Awaiting shot"}
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {drones.map((drone) => (
            <button
              key={drone.drone_id}
              type="button"
              onClick={() => setSelectedId(drone.drone_id)}
              className={`flex min-h-14 min-w-0 flex-col justify-center border px-3 text-left transition-colors ${drone.drone_id === selected?.drone_id ? "border-secondary bg-secondary/10" : "border-border/60 hover:border-secondary/60"}`}
            >
              <span className="font-mono text-xs text-muted-foreground">CAM {drone.name}</span>
              <span className="mt-1 text-xs">{drone.is_recording ? "Recording" : "Standby"}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function RealCameraOrSimulation({
  drone,
  drones,
  analysis,
  plan,
  paused = false,
}: {
  drone: DroneStatus
  drones: DroneStatus[]
  analysis?: SceneAnalysis | null
  plan?: ShotPlan | null
  paused?: boolean
}) {
  return <FeedScene drone={drone} drones={drones} analysis={analysis} plan={plan} paused={paused} />
}

function FeedScene({
  drone,
  drones,
  analysis,
  plan,
  paused,
}: {
  drone: DroneStatus
  drones: DroneStatus[]
  analysis?: SceneAnalysis | null
  plan?: ShotPlan | null
  paused: boolean
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [drone.position.x, drone.position.y, drone.position.z], fov: 60 }}
    >
      <color attach="background" args={["#090d16"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[-3, 4, 4]} intensity={2} color="#f7d7a5" />
      <pointLight position={[3, 1, 1]} intensity={8} distance={10} color="#38bdf8" />
      <PerspectiveCamera makeDefault fov={60} />
      <FeedCamera drone={drone} analysis={analysis} />
      <StageScene
        drones={drones}
        analysis={analysis ?? null}
        plan={plan ?? null}
        paused={paused}
        excludeDroneId={drone.drone_id}
        showEnvironment={false}
        showPaths={false}
        showLabels={false}
        showDrones={false}
      />
    </Canvas>
  )
}

function FeedCamera({ drone, analysis }: { drone: DroneStatus; analysis?: SceneAnalysis | null }) {
  const movement = drone.active_shot?.camera_movement
  const { camera } = useThree()
  const target = new Vector3()
  useFrame(({ clock }) => {
    camera.position.set(drone.position.x, drone.position.y, drone.position.z)
    const subject =
      analysis?.characters.find(
        (character) => character.display_name === drone.active_shot?.subject,
      ) ?? analysis?.characters[0]
    target.set(
      subject?.initial_position.x ?? drone.position.x,
      (subject?.initial_position.y ?? 0) + 0.95,
      subject?.initial_position.z ?? drone.position.z - 4,
    )
    camera.lookAt(target)
    const elapsed = clock.getElapsedTime()
    if (movement === "DOLLY_IN" || movement === "DOLLY_OUT") {
      camera.translateZ((movement === "DOLLY_IN" ? -1 : 1) * Math.sin(elapsed * 0.8) * 0.35)
    }
    if (movement === "PAN" || movement === "ORBIT") {
      camera.rotateY(Math.sin(elapsed * 0.6) * 0.008)
    }
    if (movement === "TILT") {
      camera.rotateX(Math.sin(elapsed * 0.6) * 0.004)
    }
  })
  return null
}
