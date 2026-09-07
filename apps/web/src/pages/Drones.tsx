import type { DroneStatus } from "@ca/shared-types"
import { Camera } from "lucide-react"
import { useEffect, useState } from "react"

import { CameraFeedsPanel } from "@/components/camera-feeds/CameraFeedsPanel"
import { DroneManagementPanel } from "@/components/drone-management/DroneManagementPanel"
import { dronesService } from "@/services/drones.service"

export default function Drones() {
  const [drones, setDrones] = useState<DroneStatus[]>([])
  const [selectedDroneIds, setSelectedDroneIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void dronesService
      .list()
      .then(setDrones)
      .catch(() => setError("Drones could not be loaded."))
  }, [])

  return (
    <div className="w-full max-w-6xl space-y-6">
      <header className="border-b border-border/70 pb-5">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-primary">
          <Camera className="size-4" /> Virtual fleet
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Virtual cameras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register the cameras that will fly through your analyzed scene and shot plan.
        </p>
      </header>
      {error && (
        <p className="border border-destructive/40 p-3 text-sm text-destructive">{error}</p>
      )}
      <DroneManagementPanel
        drones={drones}
        selectedDroneIds={selectedDroneIds}
        onDronesChange={setDrones}
        onSelectionChange={setSelectedDroneIds}
        onError={setError}
      />
      <CameraFeedsPanel drones={drones} />
    </div>
  )
}
