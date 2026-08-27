from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db.base import get_engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    checks = {"database": False, "gemini": False, "search": False}
    try:
        async with get_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        pass

    settings = get_settings()
    checks["gemini"] = bool(settings.gemini_api_key)
    checks["search"] = bool(settings.parallel_api_key)
    healthy = all(checks.values())
    payload = {
        "status": "ok" if healthy else "degraded",
        "dependencies": checks,
    }
    if not healthy:
        payload["status"] = "unavailable"
        return JSONResponse(status_code=503, content=payload)
    return payload
