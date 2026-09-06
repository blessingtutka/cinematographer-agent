import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from cinematography_schema.auth import SubscriptionTier, TIER_PROJECT_LIMITS


from app.db.base import Base

class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Subscription
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SAEnum(SubscriptionTier, name="subscription_tier"),
        default=SubscriptionTier.FREE,
        nullable=False,
    )

    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # 2FA (TOTP)
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    projects = relationship("ProjectModel", back_populates="owner", cascade="all, delete-orphan")
    backup_codes = relationship("BackupCode", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    drones = relationship("DroneModel", back_populates="owner", cascade="all, delete-orphan")

    @property
    def project_limit(self) -> int | None:
        return TIER_PROJECT_LIMITS[self.subscription_tier]
