from __future__ import annotations

from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db, require_admin
from app.db.models import User, UserSession, Wallet, WalletTransaction
from app.schemas.admin import (
    AdminOverview,
    AdminSessionResetResponse,
    AdminUser,
    AdminUserUpdateRequest,
    AdminWalletAdjustmentRequest,
    AdminWalletAdjustmentResponse,
)
from app.schemas.wallet import WalletSummary, WalletTransactionPublic

router = APIRouter()


def build_admin_user(user: User) -> AdminUser:
    display_name = user.profile.display_name if user.profile else user.email.split("@")[0]
    wallet_balance = user.wallet.balance if user.wallet else 0
    return AdminUser(
        id=user.id,
        email=user.email,
        display_name=display_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        role=user.role,
        created_at=user.created_at,
        wallet_balance=wallet_balance,
    )


def ensure_wallet(db: Session, user: User) -> Wallet:
    wallet = user.wallet
    if wallet:
        return wallet
    wallet = db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if wallet:
        return wallet
    wallet = Wallet(user_id=user.id, balance=0, currency="TOKEN")
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


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

    return [build_admin_user(user) for user in users]


@router.patch("/users/{user_id}", response_model=AdminUser)
def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUser:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
    db.commit()
    db.refresh(user)
    return build_admin_user(user)


@router.post("/users/{user_id}/sessions/revoke", response_model=AdminSessionResetResponse)
def revoke_user_sessions(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminSessionResetResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    now = datetime.now(timezone.utc)
    sessions = db.scalars(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        )
    ).all()
    for session in sessions:
        session.revoked_at = now
    db.commit()
    return AdminSessionResetResponse(revoked=len(sessions))


@router.post("/users/{user_id}/wallet/adjust", response_model=AdminWalletAdjustmentResponse)
def adjust_wallet(
    user_id: uuid.UUID,
    payload: AdminWalletAdjustmentRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminWalletAdjustmentResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    wallet = ensure_wallet(db, user)
    action = payload.action
    amount = payload.amount
    if action in {"credit", "debit"} and amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be greater than 0")
    if action == "set" and amount < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be 0 or greater")

    if action == "credit":
        delta = amount
        kind = "admin_credit"
    elif action == "debit":
        delta = -amount
        kind = "admin_debit"
    else:
        delta = amount - wallet.balance
        kind = "admin_set"

    if wallet.balance + delta < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance for adjustment",
        )

    wallet.balance += delta
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=delta,
        kind=kind,
        status="completed",
    )
    db.add(transaction)
    db.commit()
    db.refresh(wallet)
    db.refresh(transaction)

    return AdminWalletAdjustmentResponse(
        wallet=WalletSummary.model_validate(wallet),
        transaction=WalletTransactionPublic.model_validate(transaction),
    )
