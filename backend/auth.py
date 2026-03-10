import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt

# --- Required env vars ---
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or secrets.token_hex(32)
DEPLOY_API_KEY = os.environ.get("DEPLOY_API_KEY")
DEVICE_API_KEY = os.environ.get("DEVICE_API_KEY")

_MISSING = []
if not ADMIN_PASSWORD:
    _MISSING.append("ADMIN_PASSWORD")
if not DEPLOY_API_KEY:
    _MISSING.append("DEPLOY_API_KEY")
if not DEVICE_API_KEY:
    _MISSING.append("DEVICE_API_KEY")
if _MISSING:
    raise RuntimeError(f"Missing required environment variables: {', '.join(_MISSING)}")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode({"sub": subject, "type": "access", "exp": expire}, JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    return jwt.encode({"sub": subject, "type": "refresh", "exp": expire}, JWT_SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str, expected_type: str) -> str:
    """Decode and validate a JWT. Returns the subject."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if payload.get("type") != expected_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return sub


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Dependency: requires a valid JWT access token. Returns username."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return _decode_token(credentials.credentials, "access")


from fastapi import Header

async def get_current_user_or_api_key(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_api_key: str | None = Header(None),
) -> str:
    """Dependency: accepts JWT Bearer token OR X-API-Key header (for deploy.py)."""
    if x_api_key and x_api_key == DEPLOY_API_KEY:
        return "deploy"
    if credentials is not None:
        return _decode_token(credentials.credentials, "access")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


async def verify_device_api_key(
    x_device_key: str | None = Header(None),
) -> str:
    """Dependency: validates X-Device-Key header for ESP32 device endpoints."""
    if not x_device_key or x_device_key != DEVICE_API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing device API key")
    return "device"
