import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from cinematography_schema.schema import SimulationState

from app.db.base import Base


class SimulationModel(Base):
    """ORM model for the 'simulations' table."""

    __tablename__ = "simulations"

    simulation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scene_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scenes.scene_id", ondelete="CASCADE"), nullable=False
    )
    
    state: Mapped[SimulationState] = mapped_column(
        SAEnum(SimulationState, name="simulation_state"),
        nullable=False,
        default=SimulationState.CREATED,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
