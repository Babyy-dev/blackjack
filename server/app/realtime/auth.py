from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import uuid

from jose import JWTError, jwt
from sqlalchemy import select

from app.core.config import settings
from app.db.models import Profile, User
from app.db.session import SessionLocal


@dataclass(frozen=True)
class SocketUser:
    user_id: str
    display_name: str
    muted_until: datetime | None = None


def get_socket_user(token: str | None) -> SocketUser | None:
    if not token:
        return None

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
    except (JWTError, ValueError, TypeError):
        return None

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.id == user_id))
        if not user or not user.is_active:
            return None
        now = datetime.now(timezone.utc)
        if user.is_banned and (user.banned_until is None or user.banned_until > now):
            return None
        if user.banned_until and user.banned_until <= now and user.is_banned:
            user.is_banned = False
            user.banned_until = None
            db.commit()
        profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
        display_name = profile.display_name if profile else user.email.split("@")[0]
        return SocketUser(
            user_id=str(user.id),
            display_name=display_name,
            muted_until=user.muted_until,
        )
    finally:
        db.close()
