from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.base import get_engine
from app.routers import drones, health, scenes, simulations


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nothing to do on startup — migrations are run via Alembic.
    # Yield control to the app.
    yield
    # Graceful shutdown: dispose the connection pool.
    await get_engine().dispose()


app = FastAPI(title="Cinematographer Agent API", version="0.1.0", lifespan=lifespan)

app.include_router(scenes.router, prefix="/api")
app.include_router(simulations.router, prefix="/api")
app.include_router(drones.router, prefix="/api")
app.include_router(health.router)
