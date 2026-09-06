from collections.abc import AsyncGenerator
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _async_database_url(database_url: str) -> str:
    parsed = urlsplit(database_url)
    if parsed.scheme in {"postgresql", "postgres"}:
        parsed = parsed._replace(scheme="postgresql+asyncpg")
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if query.get("sslmode"):
        query["ssl"] = query.pop("sslmode")
    query.pop("channel_binding", None)
    parsed = parsed._replace(query=urlencode(query))
    return urlunsplit(parsed)


# Engine and session factory are created lazily so that importing Base
# (e.g. in alembic/env.py) doesn't immediately call get_settings() and
# require all env vars to be present.
_engine: Optional[AsyncEngine] = None
_AsyncSessionLocal: Optional[async_sessionmaker] = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            _async_database_url(settings.database_url),
            pool_pre_ping=True,
            echo=False,
        )
    return _engine


def get_session_factory() -> async_sessionmaker:
    global _AsyncSessionLocal
    if _AsyncSessionLocal is None:
        _AsyncSessionLocal = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async DB session per request."""
    async with get_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
