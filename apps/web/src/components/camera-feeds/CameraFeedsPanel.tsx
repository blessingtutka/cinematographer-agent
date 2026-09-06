import type { DroneStatus } from "@ca/shared-types"
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

type CameraFeedsPanelProps = { drones: DroneStatus[]; selectedDroneId?: string }

export function CameraFeedsPanel({ drones, selectedDroneId }: CameraFeedsPanelProps) {
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
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_9rem]">
        <div className="relative h-64 overflow-hidden bg-slate-950 ring-1 ring-inset ring-white/10">
          {selected ? (
            <RealCameraOrSimulation key={selected.drone_id} drone={selected} />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-slate-500">
              NO SIGNAL
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-950/75 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-slate-200">
            <span>
              {selected?.active_shot
                ? `${selected.active_shot.shot_type} / ${selected.active_shot.camera_movement}`
                : "Standby"}
            </span>
            <span>{selected?.active_shot?.subject ?? "Awaiting shot"}</span>
          </div>
        </div>
        <div className="flex gap-2 sm:flex-col">
          {drones.map((drone) => (
            <button
              key={drone.drone_id}
              type="button"
              onClick={() => setSelectedId(drone.drone_id)}
              className={`flex min-h-16 flex-1 flex-col justify-center border px-3 text-left transition-colors sm:flex-none ${drone.drone_id === selected?.drone_id ? "border-secondary bg-secondary/10" : "border-border/60 hover:border-secondary/60"}`}
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

function RealCameraOrSimulation({ drone }: { drone: DroneStatus }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    let active = true
    let nextStream: MediaStream | null = null

    if (!drone.online || !navigator.mediaDevices?.getUserMedia) {
      return () => {
        active = false
      }
    }

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((mediaStream) => {
        nextStream = mediaStream
        if (active) {
          setStream(mediaStream)
        } else {
          mediaStream.getTracks().forEach((track) => track.stop())
        }
      })
      .catch(() => {
        if (active) {
          setStream(null)
        }
      })

    return () => {
      active = false
      nextStream?.getTracks().forEach((track) => track.stop())
    }
  }, [drone.drone_id, drone.online])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (stream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="size-full object-cover"
        aria-label={`${drone.name} live camera`}
      />
    )
  }

  return <FeedScene drone={drone} />
}

function FeedScene({ drone }: { drone: DroneStatus }) {
  return (
    <Canvas camera={{ position: [0, 1.2, 5], fov: 55 }}>
      <ambientLight intensity={1.5} />
      <PerspectiveCamera makeDefault position={[0, 1.2, 5]} />
      <FeedWorld drone={drone} />
      <OrbitControls enablePan={false} enableZoom={false} />
    </Canvas>
  )
}

function FeedWorld({ drone }: { drone: DroneStatus }) {
  const movement = drone.active_shot?.camera_movement
  const seed = drone.drone_id.length * 0.17
  useFrame(({ camera, clock }) => {
    const elapsed = clock.getElapsedTime() + seed
    if (movement === "DOLLY_IN" || movement === "DOLLY_OUT") {
      camera.position.z = 5 + (movement === "DOLLY_IN" ? -1 : 1) * Math.sin(elapsed * 0.8) * 0.5
    }
    if (movement === "PAN") {
      camera.rotation.y = Math.sin(elapsed * 0.6) * 0.25
    }
    if (movement === "TILT") {
      camera.rotation.x = Math.sin(elapsed * 0.6) * 0.12
    }
  })
  return (
    <group>
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#263449" />
      </mesh>
      <mesh position={[0, -1.1, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <Text position={[0, 0.2, -3.8]} fontSize={0.35} color="#f4b860" anchorX="center">
        {drone.active_shot?.subject ?? "STANDBY"}
      </Text>
    </group>
  )
}
