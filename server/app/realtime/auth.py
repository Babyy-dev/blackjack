from __future__ import annotations

from dataclasses import dataclass
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
        profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
        display_name = profile.display_name if profile else user.email.split("@")[0]
        return SocketUser(user_id=str(user.id), display_name=display_name)
    finally:
        db.close()
