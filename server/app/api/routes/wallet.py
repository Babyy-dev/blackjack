from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crypto.addresses import derive_eth_address, derive_sol_address
from app.crypto.pricing import tokens_from_base
from app.core.deps import get_current_user, get_db
from app.db.models import (
    CryptoWithdrawal,
    User,
    Wallet,
    WalletDepositAddress,
    WalletTransaction,
)
from app.realtime.server import emit_game_state, state, state_lock
from app.schemas.wallet import (
    WalletLinkRequest,
    WalletResponse,
    WalletSummary,
    WalletTransactionPublic,
    WalletTableDepositRequest,
    WalletTableDepositResponse,
    WalletWithdrawalPublic,
    WalletWithdrawalRequest,
    WalletWithdrawalResponse,
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


def _get_next_derivation_index(db: Session, chain: str) -> int:
    current = db.scalar(
        select(func.max(WalletDepositAddress.derivation_index)).where(
            WalletDepositAddress.chain == chain
        )
    )
    return 0 if current is None else int(current) + 1


def ensure_deposit_address(db: Session, user: User, wallet: Wallet, chain: str) -> None:
    existing_address = (
        wallet.eth_deposit_address if chain == "ETH" else wallet.sol_deposit_address
    )
    if existing_address:
        return

    deposit_address = db.scalar(
        select(WalletDepositAddress)
        .where(
            WalletDepositAddress.wallet_id == wallet.id,
            WalletDepositAddress.chain == chain,
            WalletDepositAddress.is_active.is_(True),
        )
        .order_by(WalletDepositAddress.created_at.desc())
    )
    if deposit_address:
        if chain == "ETH":
            wallet.eth_deposit_address = deposit_address.address
        else:
            wallet.sol_deposit_address = deposit_address.address
        db.commit()
        return

    if chain == "ETH":
        if not settings.eth_deposit_xpub:
            return
        index = _get_next_derivation_index(db, chain)
        address = derive_eth_address(settings.eth_deposit_xpub, index)
        wallet.eth_deposit_address = address
    else:
        if not settings.sol_deposit_mnemonic:
            return
        index = _get_next_derivation_index(db, chain)
        address = derive_sol_address(settings.sol_deposit_mnemonic, index)
        wallet.sol_deposit_address = address

    deposit_address = WalletDepositAddress(
        wallet_id=wallet.id,
        user_id=user.id,
        chain=chain,
        address=address,
        derivation_index=index,
    )
    db.add(deposit_address)
    db.commit()


@router.get("", response_model=WalletResponse)
def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletResponse:
    wallet = ensure_wallet(db, current_user)
    ensure_deposit_address(db, current_user, wallet, "ETH")
    ensure_deposit_address(db, current_user, wallet, "SOL")
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


@router.get("/withdrawals", response_model=list[WalletWithdrawalPublic])
def list_withdrawals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WalletWithdrawalPublic]:
    wallet = ensure_wallet(db, current_user)
    withdrawals = db.scalars(
        select(CryptoWithdrawal)
        .where(CryptoWithdrawal.wallet_id == wallet.id)
        .order_by(CryptoWithdrawal.created_at.desc())
        .limit(20)
    ).all()
    return [WalletWithdrawalPublic.model_validate(entry) for entry in withdrawals]


@router.post("/withdrawals", response_model=WalletWithdrawalResponse)
def request_withdrawal(
    payload: WalletWithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletWithdrawalResponse:
    chain = payload.chain.upper()
    if chain not in {"ETH", "SOL"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported chain")

    amount = payload.amount_tokens
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid amount")
    if amount < settings.crypto_min_withdrawal or amount > settings.crypto_max_withdrawal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount outside withdrawal limits",
        )

    wallet = ensure_wallet(db, current_user)
    address = payload.address or (
        wallet.eth_address if chain == "ETH" else wallet.sol_address
    )
    if not address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal address not set",
        )
    if wallet.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance",
        )

    wallet.balance -= amount
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=-amount,
        kind="crypto_withdrawal",
        status="pending",
    )
    withdrawal = CryptoWithdrawal(
        wallet_id=wallet.id,
        user_id=current_user.id,
        chain=chain,
        address=address,
        amount_tokens=amount,
        status="pending",
        transaction_id=transaction.id,
    )
    db.add(withdrawal)
    db.add(transaction)
    db.flush()
    withdrawal.transaction_id = transaction.id
    db.commit()
    db.refresh(withdrawal)

    return WalletWithdrawalResponse.model_validate(withdrawal)


@router.post("/table/deposit", response_model=WalletTableDepositResponse)
async def deposit_to_table(
    payload: WalletTableDepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WalletTableDepositResponse:
    amount = payload.amount_tokens
    wallet = ensure_wallet(db, current_user)
    if wallet.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient wallet balance",
        )

    user_id = str(current_user.id)
    resolved_table_id: str | None = None
    updated_bank: int | None = None

    async with state_lock:
        resolved_table_id = payload.table_id or state.get_user_table(user_id)
        if not resolved_table_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Join a table before depositing.",
            )
        table = state.tables.get(resolved_table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found.")
        game = state.ensure_game(table)
        error = game.credit_bank(user_id, amount)
        if error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        seat = game.players.get(user_id)
        updated_bank = seat.bank if seat else None

    try:
        wallet.balance -= amount
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=-amount,
            kind="table_deposit",
            status="completed",
        )
        db.add(transaction)
        db.flush()
        db.commit()
        db.refresh(wallet)
        db.refresh(transaction)
    except Exception as exc:
        if resolved_table_id:
            async with state_lock:
                table = state.tables.get(resolved_table_id)
                if table and table.game:
                    seat = table.game.players.get(user_id)
                    if seat:
                        seat.bank = max(0, seat.bank - amount)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Deposit failed.",
        ) from exc

    await emit_game_state(resolved_table_id)

    return WalletTableDepositResponse(
        wallet=WalletSummary.model_validate(wallet),
        transaction=WalletTransactionPublic.model_validate(transaction),
        table_id=resolved_table_id,
        table_bank=updated_bank or 0,
    )
