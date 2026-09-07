import type { DroneStatus } from "@ca/shared-types"
import { Camera, Check, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dronesService } from "@/services/drones.service"

type DroneManagementPanelProps = {
  drones: DroneStatus[]
  selectedDroneIds: string[]
  onDronesChange: (drones: DroneStatus[]) => void
  onSelectionChange: (droneIds: string[]) => void
  onError: (message: string) => void
}

export function DroneManagementPanel({
  drones,
  selectedDroneIds,
  onDronesChange,
  onSelectionChange,
  onError,
}: DroneManagementPanelProps) {
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [removeTarget, setRemoveTarget] = useState<DroneStatus | null>(null)

  async function addDrone(event: { preventDefault: () => void }) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      return
    }
    try {
      const created = await dronesService.create(name)
      onDronesChange([...drones, created])
      onSelectionChange([...selectedDroneIds, created.drone_id])
      setNewName("")
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : "Could not register the drone.")
    }
  }

  async function saveName(drone: DroneStatus) {
    const name = editingName.trim()
    if (!name) {
      return
    }
    try {
      const updated = await dronesService.update(drone.drone_id, { name })
      onDronesChange(drones.map((item) => (item.drone_id === updated.drone_id ? updated : item)))
      setEditingId(null)
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : "Could not update the drone.")
    }
  }

  async function remove(drone: DroneStatus) {
    try {
      await dronesService.remove(drone.drone_id)
      setRemoveTarget(null)
      onDronesChange(drones.filter((item) => item.drone_id !== drone.drone_id))
      onSelectionChange(selectedDroneIds.filter((id) => id !== drone.drone_id))
    } catch (reason: unknown) {
      onError(reason instanceof Error ? reason.message : "Could not remove the drone.")
    }
  }

  function toggleSelection(droneId: string) {
    onSelectionChange(
      selectedDroneIds.includes(droneId)
        ? selectedDroneIds.filter((id) => id !== droneId)
        : [...selectedDroneIds, droneId],
    )
  }

  return (
    <section className="border border-border/70 bg-card/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Camera className="size-3.5 text-primary" /> Drone bay
          </p>
          <h2 className="mt-1 text-xl font-semibold">Register the aircraft for this take</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Register the aircraft that should fly the generated shot plan in the virtual stage.
          </p>
        </div>
        <Badge variant={drones.length > 0 ? "outline" : "destructive"}>
          {drones.length} registered
        </Badge>
      </div>

      <form onSubmit={(event) => void addDrone(event)} className="mt-5 flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Drone name"
          aria-label="New drone name"
          maxLength={80}
        />
        <Button type="submit" disabled={!newName.trim()}>
          <Plus /> Add drone
        </Button>
      </form>

      <div className="mt-4 grid gap-2">
        {drones.map((drone) => (
          <div
            key={drone.drone_id}
            className="grid gap-3 border border-border/60 p-3 md:grid-cols-[auto_1fr_auto] md:items-center"
          >
            <button
              type="button"
              aria-label={`Select ${drone.name}`}
              aria-pressed={selectedDroneIds.includes(drone.drone_id)}
              onClick={() => toggleSelection(drone.drone_id)}
              className={`flex size-7 items-center justify-center border ${selectedDroneIds.includes(drone.drone_id) ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}
            >
              <Check className="size-4" />
            </button>
            <div className="min-w-0">
              {editingId === drone.drone_id ? (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveName(drone)
                  }}
                >
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    autoFocus
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </form>
              ) : (
                <p className="truncate font-medium">{drone.name}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Virtual camera ready</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <Button
                asChild
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`View ${drone.name} camera`}
              >
                <Link to={`/drones?drone=${encodeURIComponent(drone.drone_id)}#camera-feeds`}>
                  <Camera />
                </Link>
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Edit ${drone.name}`}
                onClick={() => {
                  setEditingId(drone.drone_id)
                  setEditingName(drone.name)
                }}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${drone.name}`}
                onClick={() => setRemoveTarget(drone)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>
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
      <p className="mt-4 text-xs text-muted-foreground">
        {selectedDroneIds.length === 0
          ? "Select at least one drone before running a simulation."
          : `${selectedDroneIds.length} drone${selectedDroneIds.length === 1 ? "" : "s"} selected for the next simulation.`}
      </p>
    </section>
  )
}
