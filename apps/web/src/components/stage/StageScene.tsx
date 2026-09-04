import type { DroneStatus, SceneAnalysis, ShotPlan } from "@ca/shared-types"
import { Line, Text, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { Suspense, useMemo, useRef } from "react"
import { Box3, Group, Vector3 } from "three"

const CHARACTER_ASSET = "/models/base-character/scene.gltf"
const DRONE_ASSET = "/models/drone/scene.gltf"

const CHARACTER_TARGET_HEIGHT = 1.45
const DRONE_TARGET_WIDTH = 0.35

type StageSceneProps = {
  drones: DroneStatus[]
  analysis: SceneAnalysis | null
  plan: ShotPlan | null
  paused: boolean
}

export function StageScene({ drones, analysis, plan, paused }: StageSceneProps) {
  return (
    <group>
      <StageEnvironment />
      <Suspense fallback={null}>
        {analysis?.characters.map((character) => (
          <CharacterModel
            key={character.character_id}
            name={character.display_name}
            position={character.initial_position}
          />
        ))}
      </Suspense>
      <Suspense fallback={null}>
        {drones.map((drone) => (
          <DroneModel key={drone.drone_id} drone={drone} paused={paused} />
        ))}
      </Suspense>
      {plan?.shots.map((shot, index) => {
        const drone = drones.find((item) => item.name === shot.drone_name)
        const origin = drone?.position ?? { x: 0, y: 1.8, z: 0 }
        return (
          <Line
            key={shot.shot_id}
            points={previewPath(origin, index)}
            color="#67e8f9"
            opacity={0.5}
            transparent
            lineWidth={1.5}
          />
        )
      })}
    </group>
  )
}

function StageEnvironment() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#111827" roughness={0.82} />
      </mesh>
      <gridHelper args={[22, 22, "#38506d", "#1d2b40"]} position={[0, 0.02, 0]} />
      <mesh position={[0, 1.7, -6]} castShadow receiveShadow>
        <boxGeometry args={[15, 3.4, 0.3]} />
        <meshStandardMaterial color="#202c40" roughness={0.7} />
      </mesh>
      <mesh position={[-7, 0.18, -2]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[2.5, 0.35, 2.5]} />
        <meshStandardMaterial color="#26364d" roughness={0.65} />
      </mesh>
      <Text
        position={[-9.5, 0.05, -7.3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.26}
        color="#8da5c2"
      >
        STAGE A / VIRTUAL FLOOR
      </Text>
    </group>
  )
}

/**
 * Computes a uniform scale factor so that a model's bounding-box
 * dimension along `axis` matches `targetSize`, regardless of how the
 * model was originally exported/scaled.
 */
function useNormalizedScale(model: Group, targetSize: number, axis: "x" | "y" | "z") {
  return useMemo(() => {
    const box = new Box3().setFromObject(model)
    const size = new Vector3()
    box.getSize(size)
    const current = size[axis] || 1
    return targetSize / current
  }, [model, targetSize, axis])
}

function CharacterModel({
  name,
  position,
}: {
  name: string
  position: { x: number; y: number; z: number }
}) {
  const { scene } = useGLTF(CHARACTER_ASSET)
  const model = useMemo(() => scene.clone(), [scene])
  const scale = useNormalizedScale(model, CHARACTER_TARGET_HEIGHT, "y")

  const yOffset = useMemo(() => {
    const box = new Box3().setFromObject(model)
    return -box.min.y * scale
  }, [model, scale])

  return (
    <group position={[position.x, position.y, position.z]}>
      <primitive object={model} scale={0.2} position={[0, yOffset, 0]} />
      <Text
        position={[0, CHARACTER_TARGET_HEIGHT + 0.25, 0]}
        fontSize={0.24}
        color="#f8fafc"
        anchorX="center"
      >
        {name}
      </Text>
    </group>
  )
}

function DroneModel({ drone, paused }: { drone: DroneStatus; paused: boolean }) {
  const { scene } = useGLTF(DRONE_ASSET)
  const model = useMemo(() => scene.clone(), [scene])
  const scale = useNormalizedScale(model, DRONE_TARGET_WIDTH, "x")
  const group = useRef<Group>(null)
  const target = [drone.position.x, drone.position.y, drone.position.z] as const

  useFrame((_, delta) => {
    if (!group.current) {
      return
    }
    const smoothing = paused ? 1 : 1 - Math.exp(-delta * 12)
    group.current.position.lerp({ x: target[0], y: target[1], z: target[2] }, smoothing)
    const targetQuaternion = group.current.quaternion
      .clone()
      .set(drone.orientation.x, drone.orientation.y, drone.orientation.z, drone.orientation.w)
    group.current.quaternion.slerp(targetQuaternion, smoothing)
  })

  // Just the loaded model — no cone, no indicator sphere, no label.
  return (
    <group ref={group} position={target}>
      <primitive object={model} scale={scale} />
    </group>
  )
}

function previewPath(origin: { x: number; y: number; z: number }, index: number) {
  const offset = (index % 3) - 1
  return [
    [origin.x, origin.y, origin.z],
    [origin.x + offset * 2.2, Math.max(1.2, origin.y + 1), origin.z - 1.8],
    [origin.x + offset * 3.2, Math.max(1.2, origin.y + 0.35), origin.z - 4],
  ] as [number, number, number][]
}

useGLTF.preload(DRONE_ASSET)
useGLTF.preload(CHARACTER_ASSET)
