from datetime import datetime, timedelta, timezone
import hashlib
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from .config import settings

HASH_PREFIX = "sha256_bcrypt$"


def _prehash_password(plain_password: str) -> bytes:
    """Pre-hash UTF-8 password to fixed 32 bytes so bcrypt length limits are never hit."""
    return hashlib.sha256(plain_password.encode("utf-8")).digest()


def hash_password(plain_password: str) -> str:
    """Hash password with sha256+bcrypt and mark format for backward-compatible verification."""
    hashed = bcrypt.hashpw(_prehash_password(plain_password), bcrypt.gensalt()).decode("utf-8")
    return f"{HASH_PREFIX}{hashed}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify both new sha256+bcrypt hashes and legacy raw-bcrypt hashes."""
    if hashed_password.startswith(HASH_PREFIX):
        encoded_hash = hashed_password[len(HASH_PREFIX) :].encode("utf-8")
        return bcrypt.checkpw(_prehash_password(plain_password), encoded_hash)

    # Legacy compatibility: older records may be raw bcrypt hashes.
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False


# ── JWT ──────────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token. Returns payload or None."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
