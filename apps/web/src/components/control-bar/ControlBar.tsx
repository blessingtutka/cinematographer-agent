import type { Simulation } from "@ca/shared-types"
import { motion } from "framer-motion"
import { CircleStop, Pause, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { simulationsService } from "@/services/simulations.service"

type ControlBarProps = {
  sceneId?: string
  simulation: Simulation | null
  onChange: (simulation: Simulation) => void
  onError: (message: string) => void
}

export function ControlBar({ sceneId, simulation, onChange, onError }: ControlBarProps) {
  const state = simulation?.state ?? "CREATED"

  async function run(action: () => Promise<Simulation>) {
    try {
      onChange(await action())
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : "Simulation command failed")
    }
  }

  async function play() {
    if (!simulation && sceneId) {
      return run(async () => {
        const created = await simulationsService.create(sceneId)
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
      className="sticky bottom-4 z-10 flex items-center justify-between gap-4 border border-border/70 bg-card/95 p-3 text-card-foreground shadow-xl shadow-black/20 backdrop-blur dark:bg-card/95"
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
          disabled={!sceneId || state === "COMPLETED"}
          onClick={() => void play()}
        >
          <Play />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Pause simulation"
          disabled={state !== "RUNNING"}
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
          disabled={state !== "RUNNING" && state !== "PAUSED"}
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
