from __future__ import annotations

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class WalletSummary(BaseModel):
    balance: int
    currency: str
    eth_address: str | None = None
    sol_address: str | None = None
    eth_deposit_address: str | None = None
    sol_deposit_address: str | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WalletTransactionPublic(BaseModel):
    id: uuid.UUID
    amount: int
    kind: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WalletResponse(BaseModel):
    wallet: WalletSummary
    transactions: list[WalletTransactionPublic]


class WalletLinkRequest(BaseModel):
    eth_address: str | None = None
    sol_address: str | None = None


class WalletWithdrawalRequest(BaseModel):
    chain: str
    amount_tokens: int
    address: str | None = None


class WalletWithdrawalResponse(BaseModel):
    id: uuid.UUID
    chain: str
    address: str
    amount_tokens: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WalletWithdrawalPublic(BaseModel):
    id: uuid.UUID
    chain: str
    address: str
    amount_tokens: int
    status: str
    tx_hash: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
