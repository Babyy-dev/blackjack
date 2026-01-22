from __future__ import annotations

from datetime import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

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
    is_banned: bool
    banned_until: datetime | None = None
    muted_until: datetime | None = None
    role: str
    created_at: datetime
    wallet_balance: int


class AdminUserUpdateRequest(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminUserMuteRequest(BaseModel):
    minutes: int = Field(ge=1, le=1440)


class AdminUserBanRequest(BaseModel):
    minutes: int | None = Field(default=None, ge=1, le=525600)


class AdminSessionResetResponse(BaseModel):
    revoked: int


class AdminWalletAdjustmentRequest(BaseModel):
    action: Literal["credit", "debit", "set"]
    amount: int = Field(ge=0)
    reason: str | None = None


class AdminWalletAdjustmentResponse(BaseModel):
    wallet: WalletSummary
    transaction: WalletTransactionPublic


class AdminActionLogEntry(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    action: str
    target_user_id: uuid.UUID | None
    target_table_id: str | None
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminGameActionLogEntry(BaseModel):
    id: uuid.UUID
    table_id: str
    round_id: uuid.UUID | None
    user_id: uuid.UUID | None
    action: str
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminTablePlayer(BaseModel):
    user_id: str
    display_name: str
    is_ready: bool


class AdminTableSummary(BaseModel):
    id: str
    name: str
    is_private: bool
    max_players: int
    player_count: int
    invite_code: str | None = None
    round_active: bool = False
    is_paused: bool = False
    betting_locked: bool = False
    min_bet: int | None = None
    max_bet: int | None = None
    decks: int | None = None
    starting_bank: int | None = None


class AdminTableDetail(BaseModel):
    table: AdminTableSummary
    players: list[AdminTablePlayer]
    game_state: dict | None = None


class AdminTableKickRequest(BaseModel):
    user_id: str


class AdminForceStandRequest(BaseModel):
    user_id: str | None = None


class AdminTableRulesUpdateRequest(BaseModel):
    min_bet: int | None = Field(default=None, ge=1)
    max_bet: int | None = Field(default=None, ge=1)
    decks: int | None = Field(default=None, ge=1, le=8)
    starting_bank: int | None = Field(default=None, ge=1)


class AdminForceResultRequest(BaseModel):
    result: Literal["dealer_win", "player_win", "push", "dealer_blackjack", "dealer_bust"]


class AdminCryptoDeposit(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    wallet_id: uuid.UUID
    chain: str
    address: str
    tx_hash: str
    amount_base: int
    amount_tokens: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminCryptoWithdrawal(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    wallet_id: uuid.UUID
    chain: str
    address: str
    amount_tokens: int
    amount_base: int | None
    status: str
    tx_hash: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminWithdrawalActionRequest(BaseModel):
    tx_hash: str | None = None
