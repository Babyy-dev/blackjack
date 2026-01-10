from __future__ import annotations

from datetime import datetime
import uuid

from pydantic import BaseModel


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
    created_at: datetime
    wallet_balance: int
