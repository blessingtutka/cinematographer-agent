import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jwt import PyJWTError as JWTError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user, oauth2_scheme
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_pre_2fa_token,
    decode_token_of_type,
    hash_token,
)
from app.db.base import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import UserModel
from cinematography_schema.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    TokenPair,
    RefreshRequest,
    UserOut,
)

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_token_pair(db: Session, user: UserModel) -> TokenPair:
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = UserModel(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()

   
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    if user.is_2fa_enabled:
        return LoginResponse(requires_2fa=True, pre_2fa_token=create_pre_2fa_token(str(user.id)))

    return LoginResponse(requires_2fa=False, tokens=_issue_token_pair(db, user))


@router.post("/refresh", response_model=TokenPair)
def refresh_token_endpoint(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        claims = decode_token_of_type(payload.refresh_token, "refresh")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    token_hash = hash_token(payload.refresh_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if stored is None or stored.revoked or stored.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid or expired")

    user = db.get(UserModel, uuid.UUID(claims["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Rotate: revoke the used refresh token and issue a brand new pair.
    stored.revoked = True
    db.commit()

    return _issue_token_pair(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db), _user: UserModel = Depends(get_current_user)):
    token_hash = hash_token(payload.refresh_token)
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if stored:
        stored.revoked = True
        db.commit()


@router.get("/me", response_model=UserOut)
def get_me(current_user: UserModel = Depends(get_current_user)):
    return current_user
