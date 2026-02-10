from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FriendProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None = None
    is_online: bool = False
    nickname: str | None = None


class FriendRequestCreate(BaseModel):
    user_id: uuid.UUID


class FriendBlockRequest(BaseModel):
    user_id: uuid.UUID


class FriendRequestPublic(BaseModel):
    id: uuid.UUID
    requester: FriendProfile
    addressee: FriendProfile
    status: str
    created_at: datetime
    responded_at: datetime | None = None


class FriendRequestList(BaseModel):
    incoming: list[FriendRequestPublic]
    outgoing: list[FriendRequestPublic]


class FriendMessageCreate(BaseModel):
    user_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=500)


class FriendMessagePublic(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID
    message: str
    read_at: datetime | None = None
    created_at: datetime


class FriendMessageList(BaseModel):
    messages: list[FriendMessagePublic]


class FriendNicknameUpdate(BaseModel):
    user_id: uuid.UUID
    nickname: str | None = Field(None, max_length=64)


class FriendMessagesRead(BaseModel):
    user_id: uuid.UUID
    up_to_id: uuid.UUID | None = None


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


class PushPublicKey(BaseModel):
    public_key: str


class PushSubscriptionRemove(BaseModel):
    endpoint: str
