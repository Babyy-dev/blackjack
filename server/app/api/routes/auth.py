from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.db.models import Profile, User, UserSession
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.schemas.user import UserPublic

router = APIRouter()


def build_token_pair(
    access_token: str,
    refresh_token: str,
    access_expires_at: datetime,
) -> TokenPair:
    expires_in = max(
        0,
        int((access_expires_at - datetime.now(timezone.utc)).total_seconds()),
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


def issue_tokens(db: Session, user: User, request: Request) -> TokenPair:
    access_token, access_expires_at = create_access_token(str(user.id))

    session = UserSession(
        user_id=user.id,
        refresh_token_hash="",
        expires_at=datetime.now(timezone.utc),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.add(session)
    db.flush()

    refresh_token, refresh_expires_at = create_refresh_token(
        str(user.id),
        str(session.id),
    )
    session.refresh_token_hash = hash_refresh_token(refresh_token)
    session.expires_at = refresh_expires_at
    db.commit()

    return build_token_pair(access_token, refresh_token, access_expires_at)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    email = payload.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        is_active=True,
        is_admin=False,
    )
    user.profile = Profile(
        display_name=payload.display_name,
        bio=payload.bio or "",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    tokens = issue_tokens(db, user, request)
    return AuthResponse(user=UserPublic.model_validate(user), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User inactive")

    tokens = issue_tokens(db, user, request)
    return AuthResponse(user=UserPublic.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
def refresh_tokens(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
) -> TokenPair:
    try:
        token_payload = jwt.decode(
            payload.refresh_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if token_payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        user_id = token_payload.get("sub")
        session_id = token_payload.get("sid")
        if not user_id or not session_id:
            raise JWTError("Missing claims")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    try:
        session_uuid = uuid.UUID(session_id)
        user_uuid = uuid.UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    session = db.get(UserSession, session_uuid)
    if not session or session.revoked_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")
    if session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    if session.refresh_token_hash != hash_refresh_token(payload.refresh_token):
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token mismatch")
    if session.user_id != user_uuid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session mismatch")

    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    access_token, access_expires_at = create_access_token(str(user.id))
    refresh_token, refresh_expires_at = create_refresh_token(str(user.id), str(session.id))
    session.refresh_token_hash = hash_refresh_token(refresh_token)
    session.expires_at = refresh_expires_at
    db.commit()

    return build_token_pair(access_token, refresh_token, access_expires_at)


@router.post("/logout")
def logout(payload: LogoutRequest, db: Session = Depends(get_db)) -> dict:
    try:
        token_payload = jwt.decode(
            payload.refresh_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if token_payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        session_id = token_payload.get("sid")
        if not session_id:
            raise JWTError("Missing session id")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    session = db.get(UserSession, session_uuid)
    if session and not session.revoked_at:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()

    return {"status": "revoked"}


@router.get("/me", response_model=UserPublic)
def read_me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)
