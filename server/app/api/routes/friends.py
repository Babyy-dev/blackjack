from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.config import settings
from app.core.push import send_push_to_user
from app.db.models import (
    FriendMessage,
    FriendRequest,
    Friendship,
    Profile,
    PushSubscription,
    User,
    UserBlock,
)
from app.schemas.friends import (
    FriendBlockRequest,
    FriendMessageCreate,
    FriendMessageList,
    FriendMessagePublic,
    FriendMessagesRead,
    FriendNicknameUpdate,
    FriendProfile,
    FriendRequestCreate,
    FriendRequestList,
    FriendRequestPublic,
    PushPublicKey,
    PushSubscriptionCreate,
    PushSubscriptionRemove,
)
from app.realtime.server import state

router = APIRouter()

FRIEND_SEARCH_LIMIT = 12


def _load_profiles(db: Session, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, Profile]:
    if not user_ids:
        return {}
    profiles = db.scalars(
        select(Profile).where(Profile.user_id.in_(user_ids))
    ).all()
    return {profile.user_id: profile for profile in profiles}


def _build_friend_profile(
    user_id: uuid.UUID, profile: Profile | None, nickname: str | None = None
) -> FriendProfile:
    display_name = profile.display_name if profile else "Unknown"
    avatar_url = profile.avatar_url if profile else None
    return FriendProfile(
        user_id=user_id,
        display_name=display_name,
        avatar_url=avatar_url,
        is_online=state.is_user_online(str(user_id)),
        nickname=nickname,
    )


def _ensure_not_blocked(db: Session, user_id: uuid.UUID, target_id: uuid.UUID) -> None:
    blocked = db.scalar(
        select(UserBlock).where(
            or_(
                and_(
                    UserBlock.blocker_id == user_id,
                    UserBlock.blocked_id == target_id,
                ),
                and_(
                    UserBlock.blocker_id == target_id,
                    UserBlock.blocked_id == user_id,
                ),
            )
        )
    )
    if blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked.")


def _ensure_friendship(db: Session, user_id: uuid.UUID, friend_id: uuid.UUID) -> None:
    friendship = db.scalar(
        select(Friendship).where(
            and_(
                Friendship.user_id == user_id,
                Friendship.friend_id == friend_id,
            )
        )
    )
    if not friendship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")


@router.get("", response_model=list[FriendProfile])
def list_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FriendProfile]:
    friendships = db.scalars(
        select(Friendship).where(Friendship.user_id == current_user.id)
    ).all()
    friend_ids = [entry.friend_id for entry in friendships]
    profiles = _load_profiles(db, friend_ids)
    return [
        _build_friend_profile(entry.friend_id, profiles.get(entry.friend_id), entry.nickname)
        for entry in friendships
    ]


@router.get("/requests", response_model=FriendRequestList)
def list_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendRequestList:
    incoming = db.scalars(
        select(FriendRequest).where(
            and_(
                FriendRequest.addressee_id == current_user.id,
                FriendRequest.status == "pending",
            )
        )
    ).all()
    outgoing = db.scalars(
        select(FriendRequest).where(
            and_(
                FriendRequest.requester_id == current_user.id,
                FriendRequest.status == "pending",
            )
        )
    ).all()

    user_ids = {
        req.requester_id for req in incoming + outgoing
    } | {req.addressee_id for req in incoming + outgoing}
    profiles = _load_profiles(db, list(user_ids))

    def build_request(req: FriendRequest) -> FriendRequestPublic:
        return FriendRequestPublic(
            id=req.id,
            requester=_build_friend_profile(req.requester_id, profiles.get(req.requester_id)),
            addressee=_build_friend_profile(req.addressee_id, profiles.get(req.addressee_id)),
            status=req.status,
            created_at=req.created_at,
            responded_at=req.responded_at,
        )

    return FriendRequestList(
        incoming=[build_request(req) for req in incoming],
        outgoing=[build_request(req) for req in outgoing],
    )


@router.get("/search", response_model=list[FriendProfile])
def search_users(
    query: str = Query(..., min_length=2, max_length=64),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FriendProfile]:
    blocked_ids = set(
        db.scalars(
            select(UserBlock.blocked_id).where(UserBlock.blocker_id == current_user.id)
        ).all()
    )
    blocked_by_ids = set(
        db.scalars(
            select(UserBlock.blocker_id).where(UserBlock.blocked_id == current_user.id)
        ).all()
    )
    excluded_ids = blocked_ids | blocked_by_ids | {current_user.id}

    conditions = [
        User.is_active.is_(True),
        Profile.display_name.ilike(f"%{query.strip()}%"),
    ]
    if excluded_ids:
        conditions.append(Profile.user_id.notin_(excluded_ids))
    profiles = db.scalars(
        select(Profile)
        .join(User, Profile.user_id == User.id)
        .where(and_(*conditions))
        .order_by(Profile.display_name.asc())
        .limit(FRIEND_SEARCH_LIMIT)
    ).all()

    return [
        _build_friend_profile(profile.user_id, profile) for profile in profiles
    ]


@router.post("/request", response_model=FriendRequestPublic)
def send_request(
    payload: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendRequestPublic:
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot friend yourself.")

    target = db.get(User, payload.user_id)
    if not target or not target.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    _ensure_not_blocked(db, current_user.id, payload.user_id)

    existing_friend = db.scalar(
        select(Friendship).where(
            and_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == payload.user_id,
            )
        )
    )
    if existing_friend:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already friends.")

    reverse_pending = db.scalar(
        select(FriendRequest).where(
            and_(
                FriendRequest.requester_id == payload.user_id,
                FriendRequest.addressee_id == current_user.id,
                FriendRequest.status == "pending",
            )
        )
    )
    if reverse_pending:
        reverse_pending.status = "accepted"
        reverse_pending.responded_at = datetime.now(timezone.utc)
        db.add_all(
            [
                Friendship(user_id=current_user.id, friend_id=payload.user_id),
                Friendship(user_id=payload.user_id, friend_id=current_user.id),
            ]
        )
        db.commit()
        db.refresh(reverse_pending)
        profiles = _load_profiles(db, [reverse_pending.requester_id, reverse_pending.addressee_id])
        return FriendRequestPublic(
            id=reverse_pending.id,
            requester=_build_friend_profile(reverse_pending.requester_id, profiles.get(reverse_pending.requester_id)),
            addressee=_build_friend_profile(reverse_pending.addressee_id, profiles.get(reverse_pending.addressee_id)),
            status=reverse_pending.status,
            created_at=reverse_pending.created_at,
            responded_at=reverse_pending.responded_at,
        )

    existing_pending = db.scalar(
        select(FriendRequest).where(
            and_(
                FriendRequest.requester_id == current_user.id,
                FriendRequest.addressee_id == payload.user_id,
                FriendRequest.status == "pending",
            )
        )
    )
    if existing_pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Friend request already sent.")

    request = FriendRequest(
        requester_id=current_user.id,
        addressee_id=payload.user_id,
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    profiles = _load_profiles(db, [request.requester_id, request.addressee_id])
    if not state.is_user_online(str(payload.user_id)):
        sender_profile = profiles.get(request.requester_id)
        send_push_to_user(
            db,
            payload.user_id,
            {
                "title": "New friend request",
                "body": f"{sender_profile.display_name if sender_profile else 'Someone'} sent you a friend request.",
                "url": "/friends",
            },
        )
    return FriendRequestPublic(
        id=request.id,
        requester=_build_friend_profile(request.requester_id, profiles.get(request.requester_id)),
        addressee=_build_friend_profile(request.addressee_id, profiles.get(request.addressee_id)),
        status=request.status,
        created_at=request.created_at,
        responded_at=request.responded_at,
    )


@router.post("/requests/{request_id}/accept", response_model=FriendRequestPublic)
def accept_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendRequestPublic:
    request = db.get(FriendRequest, request_id)
    if not request or request.addressee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
    if request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already handled.")

    _ensure_not_blocked(db, current_user.id, request.requester_id)

    request.status = "accepted"
    request.responded_at = datetime.now(timezone.utc)

    existing = db.scalar(
        select(Friendship).where(
            and_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == request.requester_id,
            )
        )
    )
    if not existing:
        db.add_all(
            [
                Friendship(user_id=current_user.id, friend_id=request.requester_id),
                Friendship(user_id=request.requester_id, friend_id=current_user.id),
            ]
        )
    db.commit()
    db.refresh(request)
    profiles = _load_profiles(db, [request.requester_id, request.addressee_id])
    return FriendRequestPublic(
        id=request.id,
        requester=_build_friend_profile(request.requester_id, profiles.get(request.requester_id)),
        addressee=_build_friend_profile(request.addressee_id, profiles.get(request.addressee_id)),
        status=request.status,
        created_at=request.created_at,
        responded_at=request.responded_at,
    )


@router.post("/requests/{request_id}/decline", response_model=FriendRequestPublic)
def decline_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendRequestPublic:
    request = db.get(FriendRequest, request_id)
    if not request or request.addressee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
    if request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already handled.")

    request.status = "declined"
    request.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    profiles = _load_profiles(db, [request.requester_id, request.addressee_id])
    return FriendRequestPublic(
        id=request.id,
        requester=_build_friend_profile(request.requester_id, profiles.get(request.requester_id)),
        addressee=_build_friend_profile(request.addressee_id, profiles.get(request.addressee_id)),
        status=request.status,
        created_at=request.created_at,
        responded_at=request.responded_at,
    )


@router.post("/requests/{request_id}/cancel", response_model=FriendRequestPublic)
def cancel_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendRequestPublic:
    request = db.get(FriendRequest, request_id)
    if not request or request.requester_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
    if request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already handled.")

    request.status = "canceled"
    request.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    profiles = _load_profiles(db, [request.requester_id, request.addressee_id])
    return FriendRequestPublic(
        id=request.id,
        requester=_build_friend_profile(request.requester_id, profiles.get(request.requester_id)),
        addressee=_build_friend_profile(request.addressee_id, profiles.get(request.addressee_id)),
        status=request.status,
        created_at=request.created_at,
        responded_at=request.responded_at,
    )


@router.delete("/{friend_id}")
def remove_friend(
    friend_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    db.query(Friendship).filter(
        or_(
            and_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == friend_id,
            ),
            and_(
                Friendship.user_id == friend_id,
                Friendship.friend_id == current_user.id,
            ),
        )
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "removed"}


@router.get("/blocked", response_model=list[FriendProfile])
def list_blocked(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FriendProfile]:
    blocked_ids = db.scalars(
        select(UserBlock.blocked_id).where(UserBlock.blocker_id == current_user.id)
    ).all()
    profiles = _load_profiles(db, blocked_ids)
    return [
        _build_friend_profile(blocked_id, profiles.get(blocked_id)) for blocked_id in blocked_ids
    ]


@router.post("/block")
def block_user(
    payload: FriendBlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself.")

    target = db.get(User, payload.user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    existing = db.scalar(
        select(UserBlock).where(
            and_(
                UserBlock.blocker_id == current_user.id,
                UserBlock.blocked_id == payload.user_id,
            )
        )
    )
    if not existing:
        db.add(UserBlock(blocker_id=current_user.id, blocked_id=payload.user_id))

    db.query(Friendship).filter(
        or_(
            and_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == payload.user_id,
            ),
            and_(
                Friendship.user_id == payload.user_id,
                Friendship.friend_id == current_user.id,
            ),
        )
    ).delete(synchronize_session=False)

    db.query(FriendRequest).filter(
        or_(
            and_(
                FriendRequest.requester_id == current_user.id,
                FriendRequest.addressee_id == payload.user_id,
                FriendRequest.status == "pending",
            ),
            and_(
                FriendRequest.requester_id == payload.user_id,
                FriendRequest.addressee_id == current_user.id,
                FriendRequest.status == "pending",
            ),
        )
    ).delete(synchronize_session=False)

    db.commit()
    return {"status": "blocked"}


@router.delete("/block/{user_id}")
def unblock_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    db.query(UserBlock).filter(
        and_(UserBlock.blocker_id == current_user.id, UserBlock.blocked_id == user_id)
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "unblocked"}


@router.post("/messages", response_model=FriendMessagePublic)
def send_message(
    payload: FriendMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendMessagePublic:
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid recipient.")
    _ensure_not_blocked(db, current_user.id, payload.user_id)
    _ensure_friendship(db, current_user.id, payload.user_id)

    message = FriendMessage(
        sender_id=current_user.id,
        recipient_id=payload.user_id,
        message=payload.message.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    if not state.is_user_online(str(payload.user_id)):
        sender_profile = db.scalar(select(Profile).where(Profile.user_id == current_user.id))
        send_push_to_user(
            db,
            payload.user_id,
            {
                "title": sender_profile.display_name if sender_profile else "New message",
                "body": message.message,
                "url": "/friends",
            },
        )
    return FriendMessagePublic(
        id=message.id,
        sender_id=message.sender_id,
        recipient_id=message.recipient_id,
        message=message.message,
        read_at=message.read_at,
        created_at=message.created_at,
    )


@router.get("/messages/{friend_id}", response_model=FriendMessageList)
def get_messages(
    friend_id: uuid.UUID,
    before: datetime | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendMessageList:
    _ensure_not_blocked(db, current_user.id, friend_id)
    _ensure_friendship(db, current_user.id, friend_id)

    query = select(FriendMessage).where(
        or_(
            and_(
                FriendMessage.sender_id == current_user.id,
                FriendMessage.recipient_id == friend_id,
            ),
            and_(
                FriendMessage.sender_id == friend_id,
                FriendMessage.recipient_id == current_user.id,
            ),
        )
    )
    if before:
        query = query.where(FriendMessage.created_at < before)
    query = query.order_by(FriendMessage.created_at.desc()).limit(limit)

    messages = db.scalars(query).all()
    messages.reverse()
    return FriendMessageList(
        messages=[
            FriendMessagePublic(
                id=entry.id,
                sender_id=entry.sender_id,
                recipient_id=entry.recipient_id,
                message=entry.message,
                read_at=entry.read_at,
                created_at=entry.created_at,
            )
            for entry in messages
        ]
    )


@router.post("/messages/read")
def mark_messages_read(
    payload: FriendMessagesRead,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _ensure_not_blocked(db, current_user.id, payload.user_id)
    _ensure_friendship(db, current_user.id, payload.user_id)

    query = db.query(FriendMessage).filter(
        FriendMessage.sender_id == payload.user_id,
        FriendMessage.recipient_id == current_user.id,
        FriendMessage.read_at.is_(None),
    )
    if payload.up_to_id:
        target = db.get(FriendMessage, payload.up_to_id)
        if target:
            query = query.filter(FriendMessage.created_at <= target.created_at)

    now = datetime.now(timezone.utc)
    updated = query.update({FriendMessage.read_at: now}, synchronize_session=False)
    db.commit()
    return {"updated": updated, "readAt": now.isoformat()}


@router.post("/nickname")
def update_nickname(
    payload: FriendNicknameUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    friendship = db.scalar(
        select(Friendship).where(
            and_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == payload.user_id,
            )
        )
    )
    if not friendship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")
    nickname = payload.nickname.strip() if payload.nickname else None
    friendship.nickname = nickname or None
    db.commit()
    return {"status": "updated", "nickname": friendship.nickname}


@router.get("/push/public-key", response_model=PushPublicKey)
def get_push_public_key() -> PushPublicKey:
    if not settings.vapid_public_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Push notifications are not configured.",
        )
    return PushPublicKey(public_key=settings.vapid_public_key)


@router.post("/push/subscribe")
def subscribe_push(
    payload: PushSubscriptionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not settings.vapid_public_key or not settings.vapid_private_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Push notifications are not configured.",
        )
    endpoint = payload.endpoint.strip()
    existing = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
    user_agent = request.headers.get("user-agent")
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = user_agent
    else:
        db.add(
            PushSubscription(
                user_id=current_user.id,
                endpoint=endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
                user_agent=user_agent,
            )
        )
    db.commit()
    return {"status": "subscribed"}


@router.delete("/push/unsubscribe")
def unsubscribe_push(
    payload: PushSubscriptionRemove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    endpoint = payload.endpoint.strip()
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "unsubscribed"}
