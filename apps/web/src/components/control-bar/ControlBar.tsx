import type { Simulation } from "@ca/shared-types"
import { motion } from "framer-motion"
import { CircleStop, Pause, Play } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { simulationsService } from "@/services/simulations.service"

type ControlBarProps = {
  sceneId?: string
  droneIds?: string[]
  hasSelectedDrone?: boolean
  simulation: Simulation | null
  onChange: (simulation: Simulation) => void
  onError: (message: string) => void
}

export function ControlBar({
  sceneId,
  droneIds,
  hasSelectedDrone,
  simulation,
  onChange,
  onError,
}: ControlBarProps) {
  const state = simulation?.state ?? "CREATED"
  const actionInFlight = useRef(false)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<Simulation>) {
    if (actionInFlight.current) {
      return
    }
    actionInFlight.current = true
    setBusy(true)
    try {
      onChange(await action())
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : "Simulation command failed")
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }

  async function play() {
    if ((!simulation || simulation.state === "COMPLETED") && sceneId) {
      return run(async () => {
        const created = await simulationsService.create(sceneId, droneIds)
        return simulationsService.start(created.simulation_id)
      })
    }
    if (simulation) {
      return run(() => simulationsService.start(simulation.simulation_id))
    }
  }

  return (
    <motion.div
      layout
      className="flex items-center justify-between gap-4 border border-border/70 bg-card/95 p-4 text-card-foreground shadow-xl shadow-black/20 backdrop-blur dark:bg-card/95"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Simulation
        </p>
        <p className="mt-1 text-sm font-semibold">{state}</p>
      </div>
      <div className="flex gap-2">
        <Button
          size="icon"
          aria-label="Start or resume simulation"
          disabled={busy || !sceneId || !hasSelectedDrone}
          onClick={() => void play()}
        >
          <Play />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Pause simulation"
          disabled={busy || state !== "RUNNING"}
          onClick={() =>
            simulation && void run(() => simulationsService.pause(simulation.simulation_id))
          }
        >
          <Pause />
        </Button>
        <Button
          size="icon"
          variant="destructive"
          aria-label="Stop simulation"
          disabled={busy || (state !== "RUNNING" && state !== "PAUSED")}
          onClick={() =>
            simulation && void run(() => simulationsService.stop(simulation.simulation_id))
          }
        >
          <CircleStop />
        </Button>
      </div>
    </motion.div>
  )
}
