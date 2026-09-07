from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import get_engine
from app.drone.manager import DroneManager
from app.simulation.websocket import WebSocketManager
from app.config import get_settings
from app.core.security import decode_token_of_type
from app.routers import drones, health, projects, scenes, simulations, auth, two_factor, subscription

logger = logging.getLogger(__name__) 


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.drone_manager = DroneManager()
    app.state.simulation_engines = {}
    app.state.websocket_manager = WebSocketManager()
    yield
    await get_engine().dispose()


app = FastAPI(title="Cinematographer Agent API", version="0.1.0", lifespan=lifespan)
settings = get_settings()
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
if settings.frontend_url.strip() and settings.frontend_url.strip() not in cors_origins:
    cors_origins.append(settings.frontend_url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    logger.info(
        "%s %s -> %d (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        (time.perf_counter() - started) * 1000,
    )
    return response

app.include_router(auth.router, prefix="/api")
app.include_router(two_factor.router, prefix="/api")
app.include_router(subscription.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(scenes.router, prefix="/api")
app.include_router(simulations.router, prefix="/api")
app.include_router(drones.router, prefix="/api")
app.include_router(health.router)


@app.websocket("/ws/simulations/{simulation_id}")
async def simulation_websocket(websocket: WebSocket, simulation_id: str) -> None:
    access_token = websocket.query_params.get("access_token")
    if not access_token:
        await websocket.close(code=4401, reason="Authentication required")
        return
    try:
        decode_token_of_type(access_token, "access")
    except Exception:
        await websocket.close(code=4401, reason="Invalid access token")
        return

    engines = websocket.app.state.simulation_engines
    engine = engines.get(simulation_id)
    if engine is None:
        await websocket.close(code=4004, reason="Simulation not found")
        return
    manager = websocket.app.state.websocket_manager
    await manager.connect(simulation_id, websocket)
    await websocket.send_json({
        "type": "drone_update",
        "timestamp": engine._timestamp(),
        "drones": [
            drone.get_status().model_dump(mode="json", exclude_none=True)
            for drone in engine.drone_manager.get_all()
        ],
    })
    await websocket.send_json(engine._state_event())
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        await manager.disconnect(simulation_id, websocket)
