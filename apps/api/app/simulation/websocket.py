"""WebSocket connection registry for simulation event streams."""

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, simulation_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[simulation_id].add(websocket)

    async def disconnect(self, simulation_id: str, websocket: WebSocket) -> None:
        self._connections[simulation_id].discard(websocket)
        if not self._connections[simulation_id]:
            self._connections.pop(simulation_id, None)

    async def broadcast(self, simulation_id: str, event: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for websocket in self._connections.get(simulation_id, set()).copy():
            try:
                await websocket.send_json(event)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(simulation_id, websocket)

    async def close(self, simulation_id: str, code: int = 1000) -> None:
        for websocket in self._connections.get(simulation_id, set()).copy():
            await websocket.close(code=code)
            await self.disconnect(simulation_id, websocket)