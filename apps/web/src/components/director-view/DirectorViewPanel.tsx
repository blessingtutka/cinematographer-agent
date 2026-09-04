import type { DroneStatus, SceneAnalysis, ShotPlan } from "@ca/shared-types"
import { Line, OrbitControls, Text, useGLTF } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"

import characterAsset from "@/assets/3d/base-character/scene.gltf?url"
import droneAsset from "@/assets/3d/drone/scene.gltf?url"

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
        <Canvas camera={{ position: [8, 7, 10], fov: 42 }}>
          <color attach="background" args={["#080b12"]} />
          <ambientLight intensity={1.3} />
          <directionalLight position={[4, 8, 5]} intensity={2} color="#f6e7c1" />
          <Stage />
          {analysis?.characters.map((character) => (
            <CharacterModel
              key={character.character_id}
              name={character.display_name}
              position={character.initial_position}
            />
          ))}
          {drones.map((drone, index) => (
            <DroneModel key={drone.drone_id} drone={drone} index={index} paused={paused} />
          ))}
          {plan?.shots.map((shot, index) => {
            const drone = drones.find((item) => item.name === shot.drone_name)
            const origin = drone?.position ?? { x: 0, y: 1, z: 0 }
            return (
              <Line
                key={shot.shot_id}
                points={previewPath(origin, index)}
                color="#7dd3fc"
                opacity={0.45}
                transparent
                lineWidth={1}
              />
            )
          })}
          <OrbitControls makeDefault enableDamping minDistance={4} maxDistance={24} />
        </Canvas>
      </div>
    </section>
  )
}

function Stage() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#171d29" roughness={0.88} />
      </mesh>
      <gridHelper args={[18, 18, "#334155", "#1e293b"]} position={[0, 0.02, 0]} />
      <mesh position={[0, 1.5, -5]}>
        <boxGeometry args={[12, 3, 0.25]} />
        <meshStandardMaterial color="#253044" />
      </mesh>
      <Text
        position={[-8, 0.05, -6.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#64748b"
      >
        STAGE A / VIRTUAL FLOOR
      </Text>
    </group>
  )
}

function CharacterModel({
  name,
  position,
}: {
  name: string
  position: { x: number; y: number; z: number }
}) {
  const { scene } = useGLTF(characterAsset)
  return (
    <group position={[position.x, position.y, position.z]} scale={0.8}>
      <primitive object={scene.clone()} />
      <Text position={[0, 1.1, 0]} fontSize={0.22} color="#f8fafc" anchorX="center">
        {name}
      </Text>
    </group>
  )
}

function DroneModel({
  drone,
  index,
  paused,
}: {
  drone: DroneStatus
  index: number
  paused: boolean
}) {
  const { scene } = useGLTF(droneAsset)
  const color = drone.is_recording ? "#fb7185" : "#67e8f9"
  return (
    <group
      position={[drone.position.x, drone.position.y, drone.position.z]}
      scale={paused ? 0.62 : 0.7}
    >
      <primitive object={scene.clone()} />
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 1.3, 32, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {drone.is_recording && (
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
      <Text position={[0, 0.55, 0]} fontSize={0.2} color="#f8fafc" anchorX="center">
        {drone.name || `Drone ${index + 1}`}
      </Text>
    </group>
  )
}

function previewPath(origin: { x: number; y: number; z: number }, index: number) {
  const offset = (index % 3) - 1
  return [
    [origin.x, origin.y, origin.z],
    [origin.x + offset * 1.8, Math.max(1, origin.y + 0.7), origin.z - 1.5],
    [origin.x + offset * 2.4, Math.max(1, origin.y + 0.2), origin.z - 3.2],
  ] as [number, number, number][]
}
