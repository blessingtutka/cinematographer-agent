"""Async simulation runner for a single ShotPlan.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from cinematography_schema.schema import SceneAnalysis, Shot, ShotPlan, SimulationState

from app.drone.manager import DroneManager
from app.drone.virtual_drone import VirtualDrone

from .websocket import WebSocketManager

logger = logging.getLogger(__name__)

# Import the vision agent lazily so the engine module can be imported without
# Gemini being configured (handy for unit tests that mock the engine).
def _get_vision_agent():
    from app.agents.vision_agent import analyze_drone_view, VISION_TICK_INTERVAL
    return analyze_drone_view, VISION_TICK_INTERVAL


class SimulationEngine:
    def __init__(
        self,
        simulation_id: str,
        shot_plan: ShotPlan,
        drone_manager: DroneManager,
        websocket_manager: WebSocketManager,
        scene_analysis: SceneAnalysis | None = None,
    ) -> None:
        self.simulation_id = simulation_id
        self.shot_plan = shot_plan
        self.drone_manager = drone_manager
        self.websocket_manager = websocket_manager
        self.scene_analysis = scene_analysis  # required for vision analysis
        self.state = SimulationState.CREATED
        self._task: asyncio.Task | None = None
        self._shot_index = 0
        self._tick_count = 0
        # Tracks in-flight vision tasks so we can cancel them on stop
        self._vision_tasks: set[asyncio.Task] = set()

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
        # Cancel any pending vision tasks
        for task in list(self._vision_tasks):
            task.cancel()
        self._vision_tasks.clear()
        self.drone_manager.return_all_home()
        await self.websocket_manager.broadcast(self.simulation_id, self._state_event())
        await self.websocket_manager.close(self.simulation_id)

    # ------------------------------------------------------------------
    # Internal tick loop
    # ------------------------------------------------------------------

    async def _tick_loop(self) -> None:
        try:
            while self.state == SimulationState.RUNNING:
                self._tick_count += 1

                # 1. Dispatch next pending shot(s) to free drones
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

                # 2. Advance trajectories and detect completed shots
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

                # 3. Fire vision analysis tasks for drones that are due
                if self.scene_analysis is not None:
                    self._schedule_vision_tasks()

                # 4. Broadcast drone state (includes latest vision per drone)
                await self.websocket_manager.broadcast(self.simulation_id, {
                    "type": "drone_update",
                    "timestamp": self._timestamp(),
                    "drones": [
                        drone.get_status().model_dump(mode="json", exclude_none=True)
                        for drone in self.drone_manager.get_all()
                    ],
                })

                # 5. Terminate when all shots are done and no drone is active
                all_dispatched = self._shot_index >= len(self.shot_plan.shots)
                any_active = any(
                    drone.get_status().active_shot
                    for drone in self.drone_manager.get_all()
                )
                if all_dispatched and not any_active:
                    break

                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            pass

    def _schedule_vision_tasks(self) -> None:
        """Fire-and-forget vision analysis for drones that are due this tick."""
        analyze_drone_view, vision_tick_interval = _get_vision_agent()

        for drone in self.drone_manager.get_all():
            # Only VirtualDrone instances have the tick counter
            if not isinstance(drone, VirtualDrone):
                continue

            drone._vision_tick_counter += 1
            if drone._vision_tick_counter < vision_tick_interval:
                continue
            drone._vision_tick_counter = 0

            # Capture loop variables for the closure
            snapshot = drone.get_status()
            scene = self.scene_analysis
            last = drone.latest_vision
            sim_id = self.simulation_id

            async def _run_vision(
                d=drone,
                s=snapshot,
                sc=scene,
                lv=last,
                sid=sim_id,
            ) -> None:
                vision = await analyze_drone_view(s, sc, lv)
                # Write back to the live drone object
                if hasattr(d, "set_vision"):
                    d.set_vision(vision)
                # Also broadcast a dedicated vision_update event
                await self.websocket_manager.broadcast(sid, {
                    "type": "vision_update",
                    "drone_id": vision.drone_id,
                    "drone_name": vision.drone_name,
                    "timestamp": vision.timestamp,
                    "scene_description": vision.scene_description,
                    "detected_objects": [
                        obj.model_dump(mode="json", exclude_none=True)
                        for obj in vision.detected_objects
                    ],
                    "composition_score": vision.composition_score,
                    "recommended_adjustment": (
                        vision.recommended_adjustment.model_dump(mode="json")
                        if vision.recommended_adjustment
                        else None
                    ),
                    "active_shot_id": vision.active_shot_id,
                })

            task = asyncio.create_task(_run_vision())
            self._vision_tasks.add(task)
            task.add_done_callback(self._vision_tasks.discard)

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
