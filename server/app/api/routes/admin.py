from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db, require_admin
from app.db.models import User, UserSession, Wallet, WalletTransaction
from app.schemas.admin import AdminOverview, AdminUser

router = APIRouter()


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminOverview:
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=1)

    user_count = db.scalar(select(func.count(User.id))) or 0
    active_sessions = db.scalar(
        select(func.count(UserSession.id)).where(
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    ) or 0
    wallet_count = db.scalar(select(func.count(Wallet.id))) or 0
    recent_transactions = db.scalar(
        select(func.count(WalletTransaction.id)).where(
            WalletTransaction.created_at > recent_cutoff
        )
    ) or 0

    return AdminOverview(
        user_count=int(user_count),
        active_sessions=int(active_sessions),
        wallet_count=int(wallet_count),
        recent_transactions=int(recent_transactions),
        generated_at=now,
    )


@router.get("/users", response_model=list[AdminUser])
def admin_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminUser]:
    users = db.scalars(
        select(User)
        .options(selectinload(User.profile), selectinload(User.wallet))
        .order_by(User.created_at.desc())
        .limit(50)
    ).all()

    results: list[AdminUser] = []
    for user in users:
        display_name = user.profile.display_name if user.profile else user.email.split("@")[0]
        wallet_balance = user.wallet.balance if user.wallet else 0
        results.append(
            AdminUser(
                id=user.id,
                email=user.email,
                display_name=display_name,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at,
                wallet_balance=wallet_balance,
            )
        )
    return results
