from collections.abc import Generator
from datetime import datetime, timezone
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.db.redis import get_redis as get_redis_client
from app.db.session import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        subject = payload.get("sub")
        if not subject:
            raise JWTError("Missing subject")
        user_id = uuid.UUID(subject)
    except (JWTError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        ) from exc

    user = db.scalar(select(User).where(User.id == user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or missing user",
        )
    now = datetime.now(timezone.utc)
    if user.is_banned and (user.banned_until is None or user.banned_until > now):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned")
    if user.banned_until and user.banned_until <= now and user.is_banned:
        user.is_banned = False
        user.banned_until = None
        db.commit()
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def get_redis() -> Redis:
    return get_redis_client()
