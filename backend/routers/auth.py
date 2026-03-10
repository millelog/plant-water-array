from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import (
    ADMIN_PASSWORD,
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    _decode_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Hash the admin password once at startup for constant-time comparison
_ADMIN_HASH = hash_password(ADMIN_PASSWORD)


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    if not verify_password(body.password, _ADMIN_HASH):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    return TokenResponse(
        access_token=create_access_token("admin"),
        refresh_token=create_refresh_token("admin"),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(body: RefreshRequest):
    subject = _decode_token(body.refresh_token, "refresh")
    return AccessTokenResponse(access_token=create_access_token(subject))


@router.get("/me")
async def me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}
