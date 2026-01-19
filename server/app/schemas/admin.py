from __future__ import annotations

from datetime import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.wallet import WalletSummary, WalletTransactionPublic


class AdminOverview(BaseModel):
    user_count: int
    active_sessions: int
    wallet_count: int
    recent_transactions: int
    generated_at: datetime


class AdminUser(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    is_active: bool
    is_admin: bool
    role: str
    created_at: datetime
    wallet_balance: int


class AdminUserUpdateRequest(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminSessionResetResponse(BaseModel):
    revoked: int


class AdminWalletAdjustmentRequest(BaseModel):
    action: Literal["credit", "debit", "set"]
    amount: int = Field(ge=0)
    reason: str | None = None


class AdminWalletAdjustmentResponse(BaseModel):
    wallet: WalletSummary
    transaction: WalletTransactionPublic
