from sqlalchemy import TIMESTAMP, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SimulationModel(Base):
    """ORM model for the 'simulations' table."""

    __tablename__ = "simulations"

    simulation_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    scene_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("scenes.scene_id", ondelete="CASCADE"),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'CREATED'"),
    )
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
