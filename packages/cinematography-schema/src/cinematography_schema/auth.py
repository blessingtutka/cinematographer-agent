"""
Pydantic v2 schemas for the Auth API registration, login, JWT tokens,
and TOTP two-factor authentication.
"""

import uuid
import enum


from pydantic import BaseModel, EmailStr, Field

class SubscriptionTier(str, enum.Enum):
    """Subscription tiers for user accounts."""

    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    



# Project limit per tier. None means unlimited.
TIER_PROJECT_LIMITS: dict[SubscriptionTier, int | None] = {
    SubscriptionTier.FREE: 1,
    SubscriptionTier.BASIC: 3,
    SubscriptionTier.PRO: 10,
    SubscriptionTier.ENTERPRISE: None,
}



class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    """
    If the account has 2FA enabled, `requires_2fa` is True and
    `pre_2fa_token` is set instead of issuing real tokens. The client must
    then call POST /auth/2fa/login-verify with that token + a TOTP/backup
    code to receive the actual access/refresh tokens.
    """
    requires_2fa: bool
    pre_2fa_token: str | None = None
    tokens: TokenPair | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TwoFactorLoginVerifyRequest(BaseModel):
    pre_2fa_token: str
    code: str = Field(description="6-digit TOTP code, or a backup code like 'A1B2-C3D4'")


class TwoFactorSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_code_base64: str


class TwoFactorEnableRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6, description="6-digit code from the authenticator app")


class TwoFactorEnableResponse(BaseModel):
    backup_codes: list[str]


class TwoFactorDisableRequest(BaseModel):
    password: str
    code: str = Field(description="Current 6-digit TOTP code, confirms the request is really from the owner")


class BackupCodesRegenerateResponse(BaseModel):
    backup_codes: list[str]


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    is_active: bool
    is_verified: bool
    is_2fa_enabled: bool
    subscription_tier: SubscriptionTier

    model_config = {"from_attributes": True}


class ProjectQuotaOut(BaseModel):
    """Mirrors UserModel.project_limit so the frontend can render '2/3 projects used'."""
    current_count: int
    limit: int | None
    tier: SubscriptionTier