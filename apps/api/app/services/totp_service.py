import base64
import io
from datetime import datetime, timezone

import pyotp
import qrcode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import hash_token, generate_backup_code
from app.models.backup_code import BackupCode
from app.models.user import UserModel

settings = get_settings()


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_provisioning_uri(secret: str, email: str) -> str:
    """
    otpauth:// URI that authenticator apps (Google Authenticator, Authy,
    1Password, Microsoft Authenticator, etc.) consume to enroll the account.
    """
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email, issuer_name=settings.totp_issuer_name
    )


def generate_qr_code_base64(provisioning_uri: str) -> str:
    """Returns a base64-encoded PNG the client can render as <img src="data:image/png;base64,...">"""
    img = qrcode.make(provisioning_uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def verify_totp_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    # valid_window=1 tolerates minor clock drift (±30 s) between the
    # server and the user's phone, which is standard practice for TOTP.
    return totp.verify(code, valid_window=1)


async def generate_backup_codes(db: AsyncSession, user: UserModel) -> list[str]:
    """
    Wipes any existing (unused or used) backup codes and issues a fresh
    batch. Returns the PLAINTEXT codes exactly once — only the hashes are
    persisted. Called on 2FA enable and on explicit regeneration.
    """
    existing = await db.execute(select(BackupCode).where(BackupCode.user_id == user.id))
    for row in existing.scalars().all():
        await db.delete(row)

    plaintext_codes: list[str] = []
    for _ in range(settings.backup_codes_count):
        code = generate_backup_code()
        plaintext_codes.append(code)
        db.add(BackupCode(user_id=user.id, code_hash=hash_token(code)))

    await db.flush()
    return plaintext_codes


async def consume_backup_code(db: AsyncSession, user: UserModel, code: str) -> bool:
    """Marks a matching, unused backup code as used. Returns False if invalid/already used."""
    code_hash = hash_token(code.strip().upper())
    result = await db.execute(
        select(BackupCode).where(
            BackupCode.user_id == user.id,
            BackupCode.code_hash == code_hash,
            BackupCode.used.is_(False),
        )
    )
    backup_code = result.scalar_one_or_none()
    if backup_code is None:
        return False

    backup_code.used = True
    backup_code.used_at = datetime.now(timezone.utc)
    await db.flush()
    return True
