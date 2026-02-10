from __future__ import annotations

import json

try:
    from pywebpush import WebPushException, webpush
except ImportError:  # pragma: no cover - optional dependency
    WebPushException = Exception
    webpush = None
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import PushSubscription


def send_push_to_user(db: Session, user_id, payload: dict) -> None:
    if webpush is None:
        return
    if not settings.vapid_public_key or not settings.vapid_private_key:
        return
    subscriptions = db.scalars(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    ).all()
    if not subscriptions:
        return
    vapid_claims = {"sub": settings.vapid_subject}
    stale: list[PushSubscription] = []
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps(payload),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims=vapid_claims,
            )
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in {404, 410}:
                stale.append(sub)
    if stale:
        for sub in stale:
            db.delete(sub)
        db.commit()
