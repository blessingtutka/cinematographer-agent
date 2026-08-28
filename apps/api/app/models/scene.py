from sqlalchemy import TIMESTAMP, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SceneModel(Base):
    """ORM model for the 'scenes' table."""

    __tablename__ = "scenes"

    scene_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    project_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("projects.project_id", ondelete="CASCADE"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    style_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
