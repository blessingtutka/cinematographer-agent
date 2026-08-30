from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import get_db
from app.models.user import UserModel
from cinematography_schema.auth import UserOut, SubscriptionTier, TIER_PROJECT_LIMITS

router = APIRouter(prefix="/subscription", tags=["subscription"])


class TierChangeRequest(BaseModel):
    tier: SubscriptionTier


@router.get("/tiers")
def list_tiers():
    """Public pricing/limits table the frontend can render."""
    return {tier.value: limit for tier, limit in TIER_PROJECT_LIMITS.items()}


@router.post("/upgrade", response_model=UserOut)
def change_tier(
    payload: TierChangeRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """
    NOTE: in a real system this endpoint is not called directly by the
    client. It's called by your payment provider's webhook (Stripe, etc.)
    after a successful charge, using a service-to-service credential —
    never trust the client to just declare its own tier. This version is
    a stand-in so you can exercise the tier logic end-to-end.
    """
    current_user.subscription_tier = payload.tier
    db.commit()
    db.refresh(current_user)
    return current_user
