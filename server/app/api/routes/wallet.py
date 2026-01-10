from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User, Wallet, WalletTransaction
from app.schemas.wallet import (
    WalletLinkRequest,
    WalletResponse,
    WalletSummary,
    WalletTransactionPublic,
)

router = APIRouter()


def ensure_wallet(db: Session, user: User) -> Wallet:
    wallet = db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if wallet:
        return wallet
    wallet = Wallet(user_id=user.id, balance=0, currency="TOKEN")
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


@router.get("", response_model=WalletResponse)
def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletResponse:
    wallet = ensure_wallet(db, current_user)
    transactions = db.scalars(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(10)
    ).all()
    return WalletResponse(
        wallet=WalletSummary.model_validate(wallet),
        transactions=[WalletTransactionPublic.model_validate(tx) for tx in transactions],
    )


@router.put("/link", response_model=WalletSummary)
def link_wallet(
    payload: WalletLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletSummary:
    wallet = ensure_wallet(db, current_user)
    if payload.eth_address is not None:
        wallet.eth_address = payload.eth_address.strip() or None
    if payload.sol_address is not None:
        wallet.sol_address = payload.sol_address.strip() or None
    db.commit()
    db.refresh(wallet)
    return WalletSummary.model_validate(wallet)
