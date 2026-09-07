import type {
  DroneStatus,
  SimulationEvent,
  SimulationState,
  VisionUpdateEvent,
} from "@ca/shared-types"
import { useEffect, useState } from "react"

import { simulationsService } from "@/services/simulations.service"

export function useSimulationWS(simulationId: string | undefined, enabled = true) {
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [lastEvent, setLastEvent] = useState<SimulationEvent | null>(null)
  const [error, setError] = useState<Event | null>(null)
  const [drones, setDrones] = useState<DroneStatus[]>([])
  const [vision, setVision] = useState<Map<string, VisionUpdateEvent>>(new Map())
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null)
  const [connectionState, setConnectionState] = useState<"connecting" | "open" | "closed">("closed")

  useEffect(() => {
    if (!simulationId || !enabled) {
      return
    }
    const activeSimulationId = simulationId

    let active = true
    let reconnectTimer: number | undefined
    let websocket: WebSocket | undefined

    function connect() {
      if (!active) {
        return
      }
      setConnectionState("connecting")
      websocket = new WebSocket(simulationsService.webSocketUrl(activeSimulationId))
      websocket.onopen = () => setConnectionState("open")
      websocket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as SimulationEvent
          setLastEvent(event)
          setEvents((current) => [...current.slice(-99), event])
          if (event.type === "drone_update") {
            setDrones(event.drones)
          }
          if (event.type === "vision_update") {
            setVision((current) => new Map(current).set(event.drone_id, event))
          }
          if (event.type === "state_change") {
            setSimulationState(event.new_state)
          }
        } catch {
          setError(new Event("invalid-message"))
        }
      }
      websocket.onerror = setError
      websocket.onclose = () => {
        setConnectionState("closed")
        if (active && enabled) {
          reconnectTimer = window.setTimeout(connect, 750)
        }
      }
    }

    connect()

    return () => {
      active = false
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
      }
      websocket?.close()
    }
  }, [enabled, simulationId])

  return { events, lastEvent, error, drones, vision, simulationState, connectionState }
}
