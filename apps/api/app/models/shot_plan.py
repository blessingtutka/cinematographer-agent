from sqlalchemy import TIMESTAMP, ForeignKey, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ShotPlanModel(Base):
    """ORM model for the 'shot_plans' table."""

    __tablename__ = "shot_plans"
    __table_args__ = (UniqueConstraint("scene_id", name="uq_shot_plans_scene_id"),)

    plan_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    scene_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("scenes.scene_id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
