import type { DroneStatus, SceneAnalysis, ShotPlan } from "@ca/shared-types"
import { Line, Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import { Group } from "three"

const DRONE_ARM_SPAN = 0.35

type StageSceneProps = {
  drones: DroneStatus[]
  analysis: SceneAnalysis | null
  plan: ShotPlan | null
  paused: boolean
  excludeDroneId?: string
  showEnvironment?: boolean
  showPaths?: boolean
  showLabels?: boolean
  showDrones?: boolean
}

export function StageScene({
  drones,
  analysis,
  plan,
  paused,
  excludeDroneId,
  showEnvironment = true,
  showPaths = true,
  showLabels = true,
  showDrones = true,
}: StageSceneProps) {
  return (
    <group>
      {showEnvironment && <StageEnvironment />}
      {analysis?.characters.map((character) => (
        <CharacterModel
          key={character.character_id}
          name={character.display_name}
          position={character.initial_position}
          showLabel={showLabels}
        />
      ))}
      {showDrones && drones
        .filter((drone) => drone.drone_id !== excludeDroneId)
        .map((drone) => (
          <DroneModelWrapper key={drone.drone_id} drone={drone} paused={paused} />
        ))}
      {showPaths &&
        plan?.shots.map((shot, index) => {
          const drone = drones.find((item) => item.name === shot.drone_name)
          const origin = drone?.position ?? { x: 0, y: 1.8, z: 0 }
          return (
            <Line
              key={shot.shot_id}
              points={previewPath(origin, index)}
              color={index === 0 ? "#f4b860" : "#38bdf8"}
              opacity={0.72}
              transparent
              lineWidth={2}
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
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#171b24" roughness={0.82} />
      </mesh>
      <gridHelper args={[18, 18, "#475569", "#273449"]} position={[0, 0.02, 0]} />
      <mesh position={[0, 2.5, -5.5]} castShadow receiveShadow>
        <planeGeometry args={[18, 5]} />
        <meshStandardMaterial color="#222b3b" roughness={0.9} />
      </mesh>
      <mesh position={[-8.8, 2.5, 0]} receiveShadow>
        <planeGeometry args={[0.2, 5]} />
        <meshStandardMaterial color="#151c2a" roughness={0.95} />
      </mesh>
      <mesh position={[8.8, 2.5, 0]} receiveShadow>
        <planeGeometry args={[0.2, 5]} />
        <meshStandardMaterial color="#151c2a" roughness={0.95} />
      </mesh>
    </group>
  )
}

/**
 * Simple, cheap stand-in for a performer: a capsule-ish body (cylinder)
 * topped with a sphere head. Sized so the whole figure is exactly
 * CHARACTER_TARGET_HEIGHT tall, feet resting on y = 0 relative to the
 * group's position.
 */
function CharacterModel({
  name,
  position,
  showLabel,
}: {
  name: string
  position: { x: number; y: number; z: number }
  showLabel: boolean
}) {
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh position={[0, 0.86, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.72, 6, 16]} />
        <meshStandardMaterial color="#2369a8" roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.19, 20, 14]} />
        <meshStandardMaterial color="#d88b68" roughness={0.62} />
      </mesh>
      <mesh position={[0, 1.05, 0.19]} castShadow>
        <boxGeometry args={[0.32, 0.22, 0.06]} />
        <meshStandardMaterial color="#111827" roughness={0.32} metalness={0.4} />
      </mesh>
      <mesh position={[-0.28, 0.86, 0]} rotation={[0, 0, -0.08]} castShadow>
        <capsuleGeometry args={[0.055, 0.48, 5, 10]} />
        <meshStandardMaterial color="#1d4f80" roughness={0.55} />
      </mesh>
      <mesh position={[0.28, 0.86, 0]} rotation={[0, 0, 0.08]} castShadow>
        <capsuleGeometry args={[0.055, 0.48, 5, 10]} />
        <meshStandardMaterial color="#1d4f80" roughness={0.55} />
      </mesh>
      <mesh position={[-0.1, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.38, 5, 10]} />
        <meshStandardMaterial color="#172f4d" roughness={0.58} />
      </mesh>
      <mesh position={[0.1, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.07, 0.38, 5, 10]} />
        <meshStandardMaterial color="#172f4d" roughness={0.58} />
      </mesh>
      {showLabel && (
        <Text
          position={[0, 1.85, 0]}
          fontSize={0.16}
          color="#ffffff"
          outlineColor="#07111f"
          outlineWidth={0.025}
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      )}
    </group>
  )
}

/**
 * Simple, cheap stand-in for a drone: a small central body with four
 * arms in an X pattern and a rotor marker at each arm tip. Sized so the
 * arm span matches DRONE_ARM_SPAN.
 */
function DroneModel() {
  const armLength = DRONE_ARM_SPAN / 2
  const armRadius = 0.012
  const rotorRadius = 0.045
  const bodySize = 0.09

  const armOffsets = [
    { angle: Math.PI / 4, key: "ne" },
    { angle: (3 * Math.PI) / 4, key: "nw" },
    { angle: (5 * Math.PI) / 4, key: "sw" },
    { angle: (7 * Math.PI) / 4, key: "se" },
  ]

  const rotorGroup = useRef<Group>(null)

  useFrame((_, delta) => {
    if (rotorGroup.current) {
      rotorGroup.current.rotation.y += delta * 14
    }
  })

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[bodySize, bodySize * 0.4, bodySize]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.3} />
      </mesh>
      <group ref={rotorGroup}>
        {armOffsets.map(({ angle, key }) => {
          const x = Math.cos(angle) * armLength
          const z = Math.sin(angle) * armLength
          return (
            <group key={key}>
              <mesh position={[x / 2, 0, z / 2]} rotation={[0, -angle, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[armRadius, armRadius, armLength, 6]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.2} />
              </mesh>
              <mesh position={[x, 0.01, z]}>
                <cylinderGeometry args={[rotorRadius, rotorRadius, 0.01, 16]} />
                <meshStandardMaterial
                  color="#22d3ee"
                  emissive="#0891b2"
                  emissiveIntensity={0.4}
                  roughness={0.3}
                />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

function DroneModelWrapper({ drone, paused }: { drone: DroneStatus; paused: boolean }) {
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

  return (
    <group ref={group} position={target}>
      <DroneModel />
    </group>
  )
}

function previewPath(origin: { x: number; y: number; z: number }, index: number) {
  const offset = (index % 3) - 1
  return [
    [clampStageX(origin.x), Math.max(1.2, origin.y), clampStageZ(origin.z)],
    [
      clampStageX(origin.x + offset * 2.2),
      Math.max(1.2, origin.y + 1),
      clampStageZ(origin.z - 1.8),
    ],
    [
      clampStageX(origin.x + offset * 3.2),
      Math.max(1.2, origin.y + 0.35),
      clampStageZ(origin.z - 4),
    ],
  ] as [number, number, number][]
}

function clampStageX(value: number) {
  return Math.max(-8, Math.min(8, value))
}

function clampStageZ(value: number) {
  return Math.max(-5, Math.min(5, value))
}
