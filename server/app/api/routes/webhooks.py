from __future__ import annotations

import hashlib
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db
from app.crypto.pricing import tokens_from_base
from app.db.models import CryptoDeposit, Wallet, WalletDepositAddress, WalletTransaction

router = APIRouter()


def _verify_signature(body: bytes, signature: str | None) -> None:
    if not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing signature")
    expected = hmac.new(
        settings.crypto_webhook_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")


@router.post("/webhooks/crypto")
async def crypto_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_signature: str | None = Header(default=None),
) -> dict:
    body = await request.body()
    _verify_signature(body, x_webhook_signature)
    payload = await request.json()

    chain = str(payload.get("chain") or "").upper()
    address = str(payload.get("address") or "").strip()
    tx_hash = str(payload.get("tx_hash") or "").strip()
    amount_base = payload.get("amount_base")

    if chain not in {"ETH", "SOL"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported chain")
    if not address or not tx_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing payload fields")
    try:
        amount_base_int = int(amount_base)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid amount")
    if amount_base_int <= 0:
        return {"status": "ignored", "reason": "zero amount"}

    existing = db.scalar(select(CryptoDeposit).where(CryptoDeposit.tx_hash == tx_hash))
    if existing:
        return {"status": "duplicate"}

    deposit_address = db.scalar(
        select(WalletDepositAddress).where(
            WalletDepositAddress.chain == chain,
            WalletDepositAddress.address == address,
            WalletDepositAddress.is_active.is_(True),
        )
    )
    if not deposit_address:
        return {"status": "ignored", "reason": "address not found"}

    wallet = db.get(Wallet, deposit_address.wallet_id)
    if not wallet:
        return {"status": "ignored", "reason": "wallet not found"}

    amount_tokens = tokens_from_base(chain, amount_base_int)
    if amount_tokens <= 0:
        return {"status": "ignored", "reason": "amount too small"}

    wallet.balance += amount_tokens
    deposit = CryptoDeposit(
        wallet_id=wallet.id,
        user_id=deposit_address.user_id,
        chain=chain,
        address=address,
        tx_hash=tx_hash,
        amount_base=amount_base_int,
        amount_tokens=amount_tokens,
        status="confirmed",
    )
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=amount_tokens,
        kind="crypto_deposit",
        status="completed",
    )
    db.add(deposit)
    db.add(transaction)
    db.commit()
    return {"status": "credited", "tokens": amount_tokens}
