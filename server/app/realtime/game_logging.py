from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.db.models import GameActionLog, GameRound
from app.db.session import SessionLocal


def _coerce_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        try:
            return uuid.UUID(hex=value)
        except ValueError:
            return None


def record_round_start(table_id: str, round_id: str, started_at: datetime | None = None) -> None:
    session = SessionLocal()
    try:
        session.add(
            GameRound(
                id=_coerce_uuid(round_id) or uuid.uuid4(),
                table_id=table_id,
                started_at=started_at or datetime.now(timezone.utc),
                ended_at=None,
                summary=None,
            )
        )
        session.commit()
    finally:
        session.close()


def record_round_end(table_id: str, round_id: str, summary: dict) -> None:
    session = SessionLocal()
    try:
        round_uuid = _coerce_uuid(round_id)
        if round_uuid:
            record = session.get(GameRound, round_uuid)
        else:
            record = None
        if record:
            record.ended_at = datetime.now(timezone.utc)
            record.summary = summary
            session.commit()
    finally:
        session.close()


def record_action(event: dict) -> None:
    session = SessionLocal()
    try:
        session.add(
            GameActionLog(
                table_id=event.get("table_id") or "unknown",
                round_id=_coerce_uuid(event.get("round_id")),
                user_id=_coerce_uuid(event.get("user_id")),
                action=event.get("action") or "unknown",
                payload=event.get("payload") or {},
            )
        )
        session.commit()
    finally:
        session.close()
