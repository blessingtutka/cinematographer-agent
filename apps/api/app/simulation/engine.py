"""Async simulation runner for a single ShotPlan."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from cinematography_schema.schema import Shot, ShotPlan, SimulationState

from app.drone.manager import DroneManager

from .websocket import WebSocketManager


class SimulationEngine:
    def __init__(self, simulation_id: str, shot_plan: ShotPlan, drone_manager: DroneManager, websocket_manager: WebSocketManager) -> None:
        self.simulation_id = simulation_id
        self.shot_plan = shot_plan
        self.drone_manager = drone_manager
        self.websocket_manager = websocket_manager
        self.state = SimulationState.CREATED
        self._task: asyncio.Task | None = None
        self._shot_index = 0

    async def start(self) -> None:
        self.state = SimulationState.RUNNING
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._tick_loop())

    async def pause(self) -> None:
        self.state = SimulationState.PAUSED
        await self.websocket_manager.broadcast(self.simulation_id, self._state_event())
        await self.websocket_manager.close(self.simulation_id)

    async def stop(self) -> None:
        self.state = SimulationState.COMPLETED
        if self._task and not self._task.done():
            self._task.cancel()
        self.drone_manager.return_all_home()
        await self.websocket_manager.broadcast(self.simulation_id, self._state_event())
        await self.websocket_manager.close(self.simulation_id)

    async def _tick_loop(self) -> None:
        try:
            while self.state == SimulationState.RUNNING:
                started = self._dispatch_shots()
                for shot in started:
                    drone = self.drone_manager.get_by_name(shot.drone_name)
                    if drone:
                        await self.websocket_manager.broadcast(self.simulation_id, {
                            "type": "shot_started",
                            "shot_id": shot.shot_id,
                            "drone_id": drone.drone_id,
                            "shot_type": shot.shot_type.value,
                            "camera_movement": shot.camera_movement.value,
                            "subject": shot.subject,
                        })
                completed: list[tuple[Shot, str]] = []
                for drone in self.drone_manager.get_all():
                    advance = getattr(drone, "advance", None)
                    active = drone.get_status().active_shot
                    if advance and active and advance(0.1):
                        completed.append((active, drone.drone_id))
                for shot, drone_id in completed:
                    await self.websocket_manager.broadcast(self.simulation_id, {
                        "type": "shot_completed",
                        "shot_id": shot.shot_id,
                        "drone_id": drone_id,
                        "shot_type": shot.shot_type.value,
                        "camera_movement": shot.camera_movement.value,
                        "subject": shot.subject,
                    })
                await self.websocket_manager.broadcast(self.simulation_id, {
                    "type": "drone_update",
                    "timestamp": self._timestamp(),
                    "drones": [drone.get_status().model_dump(mode="json", exclude_none=True) for drone in self.drone_manager.get_all()],
                })
                if self._shot_index >= len(self.shot_plan.shots) and not any(drone.get_status().active_shot for drone in self.drone_manager.get_all()):
                    break
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass

    def _dispatch_shots(self) -> list[Shot]:
        started: list[Shot] = []
        while self._shot_index < len(self.shot_plan.shots):
            shot = self.shot_plan.shots[self._shot_index]
            drone = self.drone_manager.get_by_name(shot.drone_name)
            if drone is None:
                self.drone_manager.dispatch_shot(shot)
                self._shot_index += 1
                continue
            if drone.get_status().active_shot is not None:
                break
            self.drone_manager.dispatch_shot(shot)
            started.append(shot)
            self._shot_index += 1
        return started

    def _timestamp(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _state_event(self) -> dict:
        return {
            "type": "state_change",
            "simulation_id": self.simulation_id,
            "new_state": self.state.value,
            "timestamp": self._timestamp(),
        }