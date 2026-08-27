from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.base import get_engine
from app.drone.manager import DroneManager
from app.drone.virtual_drone import VirtualDrone
from app.routers import drones, health, scenes, simulations
from cinematography_schema.schema import Vector3


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nothing to do on startup — migrations are run via Alembic.
    # Yield control to the app.
    app.state.drone_manager = DroneManager()
    for drone_id, name in (("drone-001", "Alpha"), ("drone-002", "Bravo"), ("drone-003", "Charlie")):
        app.state.drone_manager.register(
            VirtualDrone(drone_id, name, Vector3(x=0, y=0, z=0))
        )
    yield
    # Graceful shutdown: dispose the connection pool.
    await get_engine().dispose()


app = FastAPI(title="Cinematographer Agent API", version="0.1.0", lifespan=lifespan)

app.include_router(scenes.router, prefix="/api")
app.include_router(simulations.router, prefix="/api")
app.include_router(drones.router, prefix="/api")
app.include_router(health.router)
