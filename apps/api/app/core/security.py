import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from jwt import PyJWTError as JWTError

from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenType = Literal["access", "refresh", "pre_2fa"]


# ---------- Password hashing ----------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------- JWT ----------

def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta, extra_claims: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": secrets.token_hex(16),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str) -> str:
    return _create_token(
        user_id, "access", timedelta(minutes=settings.access_token_expire_minutes)
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        user_id, "refresh", timedelta(days=settings.refresh_token_expire_days)
    )


def create_pre_2fa_token(user_id: str) -> str:
    """
    Issued after a correct email+password check when the account has 2FA
    enabled..
    """
    return _create_token(
        user_id, "pre_2fa", timedelta(minutes=settings.pre_2fa_token_expire_minutes)
    )


def decode_token(token: str) -> dict:
    """Raises jose.JWTError on invalid/expired tokens."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def decode_token_of_type(token: str, expected_type: TokenType) -> dict:
    payload = decode_token(token)
    if payload.get("type") != expected_type:
        raise JWTError(f"Expected token type '{expected_type}', got '{payload.get('type')}'")
    return payload


# ---------- Hashing for stored secrets (refresh tokens, backup codes) ----------

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_backup_code() -> str:
    """Human-friendly code like 'A1B2-C3D4'."""
    raw = secrets.token_hex(4).upper()
    return f"{raw[:4]}-{raw[4:]}"
