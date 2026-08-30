import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import verify_password, decode_token_of_type
from app.db.base import get_db
from app.models.user import UserModel
from cinematography_schema.auth import (
    TwoFactorSetupResponse,
    TwoFactorEnableRequest,
    TwoFactorEnableResponse,
    TwoFactorDisableRequest,
    TwoFactorLoginVerifyRequest,
    BackupCodesRegenerateResponse,
    TokenPair,
)
from app.services import totp_service
from app.routers.auth import _issue_token_pair

router = APIRouter(prefix="/auth/2fa", tags=["2fa"])


@router.post("/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """
    Step 1 of enabling 2FA: generates a new TOTP secret and returns a QR
    code to scan with an authenticator app. The secret is stored but 2FA
    is NOT yet enforced until /enable is called with a valid code, so the
    user can't lock themselves out by scanning and abandoning the flow.
    """
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")

    secret = totp_service.generate_totp_secret()
    current_user.totp_secret = secret
    db.commit()

    uri = totp_service.get_provisioning_uri(secret, current_user.email)
    qr_b64 = totp_service.generate_qr_code_base64(uri)

    return TwoFactorSetupResponse(secret=secret, provisioning_uri=uri, qr_code_base64=qr_b64)


@router.post("/enable", response_model=TwoFactorEnableResponse)
def enable_2fa(
    payload: TwoFactorEnableRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Step 2: proves the user actually has the authenticator configured, then turns 2FA on and issues backup codes."""
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is already enabled")
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Call /auth/2fa/setup first")

    if not totp_service.verify_totp_code(current_user.totp_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authentication code")

    current_user.is_2fa_enabled = True
    db.commit()

    backup_codes = totp_service.generate_backup_codes(db, current_user)
    return TwoFactorEnableResponse(backup_codes=backup_codes)


@router.post("/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable_2fa(
    payload: TwoFactorDisableRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Requires both the account password AND a current TOTP code, so a hijacked session token alone can't turn off 2FA."""
    if not current_user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    if not totp_service.verify_totp_code(current_user.totp_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authentication code")

    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    from app.models.backup_code import BackupCode
    db.query(BackupCode).filter(BackupCode.user_id == current_user.id).delete()
    db.commit()


@router.post("/backup-codes/regenerate", response_model=BackupCodesRegenerateResponse)
def regenerate_backup_codes(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if not current_user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")
    codes = totp_service.generate_backup_codes(db, current_user)
    return BackupCodesRegenerateResponse(backup_codes=codes)


@router.post("/login-verify", response_model=TokenPair)
def login_verify(payload: TwoFactorLoginVerifyRequest, db: Session = Depends(get_db)):
    """
    Step 2 of a 2FA login: exchanges the short-lived pre_2fa_token plus a
    TOTP or backup code for a real access/refresh token pair.
    """
    try:
        claims = decode_token_of_type(payload.pre_2fa_token, "pre_2fa")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired 2FA challenge")

    user = db.get(UserModel, uuid.UUID(claims["sub"]))
    if user is None or not user.is_active or not user.is_2fa_enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired 2FA challenge")

    code = payload.code.strip()
    valid = False

    if code.isdigit() and len(code) == 6:
        valid = totp_service.verify_totp_code(user.totp_secret, code)
    else:
        # Anything non-6-digit is treated as a backup recovery code attempt.
        valid = totp_service.consume_backup_code(db, user, code)

    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid authentication code")

    return _issue_token_pair(db, user)
