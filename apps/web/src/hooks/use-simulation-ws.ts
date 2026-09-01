import type { SimulationEvent } from "@ca/shared-types"
import { useEffect, useState } from "react"

import { simulationsService } from "@/services/simulations.service"

export function useSimulationWS(simulationId: string | undefined, enabled = true) {
  const [events, setEvents] = useState<SimulationEvent[]>([])
  const [lastEvent, setLastEvent] = useState<SimulationEvent | null>(null)
  const [error, setError] = useState<Event | null>(null)

  useEffect(() => {
    if (!simulationId || !enabled) {
      return
    }

    const websocket = new WebSocket(simulationsService.webSocketUrl(simulationId))
    websocket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as SimulationEvent
        setLastEvent(event)
        setEvents((current) => [...current.slice(-99), event])
      } catch {
        setError(new Event("invalid-message"))
      }
    }
    websocket.onerror = setError

    return () => websocket.close()
  }, [enabled, simulationId])

  return { events, lastEvent, error }
}
