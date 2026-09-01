from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.base import get_db
from app.models.user import UserModel
from app.services.subscription_service import get_project_count
from cinematography_schema.auth import (
    UserOut,
    SubscriptionTier,
    TIER_PROJECT_LIMITS,
    ProjectQuotaOut,
)

router = APIRouter(prefix="/subscription", tags=["subscription"])


class TierChangeRequest(BaseModel):
    tier: SubscriptionTier


@router.get("/tiers")
def list_tiers():
    """Public pricing/limits table the frontend can render."""
    return {tier.value: limit for tier, limit in TIER_PROJECT_LIMITS.items()}


@router.get("/quota", response_model=ProjectQuotaOut)
async def get_quota(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Returns the current user's project usage vs their tier limit."""
    current_count = await get_project_count(db, current_user)
    return ProjectQuotaOut(
        current_count=current_count,
        limit=current_user.project_limit,
        tier=current_user.subscription_tier,
    )


@router.post("/upgrade", response_model=UserOut)
async def change_tier(
    payload: TierChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    NOTE: in a real system this is called by your payment provider's webhook,
    not directly by the client. This version is a stand-in for end-to-end testing.
    """
    current_user.subscription_tier = payload.tier
    await db.flush()
    await db.refresh(current_user)
    return current_user
