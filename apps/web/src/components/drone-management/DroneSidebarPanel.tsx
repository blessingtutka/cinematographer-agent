import type { DroneStatus } from "@ca/shared-types"
import { Camera, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dronesService } from "@/services/drones.service"

export function DroneSidebarPanel() {
  const [drones, setDrones] = useState<DroneStatus[]>([])
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<DroneStatus | null>(null)

  useEffect(() => {
    void dronesService
      .list()
      .then(setDrones)
      .catch(() => setError("Drones unavailable"))
  }, [])

  async function register(event: { preventDefault: () => void }) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }
    try {
      const drone = await dronesService.create(trimmedName)
      setDrones((current) => [...current, drone])
      setName("")
      setError(null)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not register drone")
    }
  }

  async function remove(drone: DroneStatus) {
    try {
      await dronesService.remove(drone.drone_id)
      setRemoveTarget(null)
      setDrones((current) => current.filter((item) => item.drone_id !== drone.drone_id))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not remove drone")
    }
  }

  return (
    <div className="px-2 py-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
          <Camera className="size-3" /> Drones
        </p>
        <span className="font-mono text-[10px] text-sidebar-foreground/50">{drones.length}</span>
      </div>
      <form onSubmit={(event) => void register(event)} className="mb-3 flex gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Register phone"
          aria-label="Drone or phone name"
          className="h-7 border-sidebar-border bg-sidebar-accent/40 text-xs"
        />
        <Button type="submit" size="icon-sm" aria-label="Register drone" disabled={!name.trim()}>
          <Plus />
        </Button>
      </form>
      {error && <p className="mb-2 px-2 text-[10px] text-destructive">{error}</p>}
      <div className="space-y-1">
        {drones.map((drone) => (
          <div
            key={drone.drone_id}
            className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="min-w-0 flex-1 truncate text-xs">{drone.name}</span>
            <Button asChild size="icon-xs" variant="ghost" aria-label={`View ${drone.name} camera`}>
              <Link
                to={`/studio/simulation?drone=${encodeURIComponent(drone.drone_id)}#camera-feeds`}
              >
                <Camera />
              </Link>
            </Button>
            <button
              type="button"
              title={`Remove ${drone.name}`}
              onClick={() => setRemoveTarget(drone)}
              className="text-sidebar-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      {drones.length === 0 && (
        <p className="px-2 text-[10px] text-sidebar-foreground/45">No drones registered</p>
      )}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this drone?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{removeTarget?.name}&quot; from your registered aircraft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removeTarget) {
                  void remove(removeTarget)
                }
              }}
            >
              Remove drone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
