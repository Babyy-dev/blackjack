from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import uuid

import socketio
from sqlalchemy import and_, or_, select

from app.core.config import settings
from app.core.push import send_push_to_user
from app.db.models import FriendMessage, Friendship, Profile, UserBlock
from app.db.session import SessionLocal
from app.realtime.auth import get_socket_user
from app.realtime.game_logging import record_action, record_round_end, record_round_start
from app.realtime.state import (
    MAX_TABLE_PLAYERS,
    ChatMessage,
    LobbyState,
    TableConfig,
    TableError,
    TableState,
)

LOBBY_ROOM = "lobby"
TURN_TIMEOUT_SECONDS = 25
CHAT_MESSAGE_LIMIT = 280
CHAT_RATE_LIMIT_SECONDS = 0.5
GAME_ACTION_RATE_LIMIT_SECONDS = 0.25
MUTE_MIN_SECONDS = 30
MUTE_MAX_SECONDS = 3600
FRIEND_MESSAGE_LIMIT = 500

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins,
    client_manager=socketio.AsyncRedisManager(settings.redis_url),
)

state = LobbyState()
state_lock = asyncio.Lock()


def _parse_int(value: object, default: int, min_value: int, max_value: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return min(max(parsed, min_value), max_value)


def _is_owner(table: TableState | None, user_id: str) -> bool:
    return bool(table and table.owner_id == user_id)


def _fetch_friend_ids(user_id: str) -> list[str]:
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        return []
    try:
        return [
            str(friend_id)
            for friend_id in db.scalars(
                select(Friendship.friend_id).where(Friendship.user_id == user_uuid)
            ).all()
        ]
    finally:
        db.close()


def _is_blocked_pair(user_id: str, target_id: str) -> bool:
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id)
        target_uuid = uuid.UUID(target_id)
    except (ValueError, TypeError):
        return True
    try:
        blocked = db.scalar(
            select(UserBlock).where(
                or_(
                    and_(
                        UserBlock.blocker_id == user_uuid,
                        UserBlock.blocked_id == target_uuid,
                    ),
                    and_(
                        UserBlock.blocker_id == target_uuid,
                        UserBlock.blocked_id == user_uuid,
                    ),
                )
            )
        )
        return bool(blocked)
    finally:
        db.close()


def _persist_friend_message(sender_id: str, recipient_id: str, message: str) -> FriendMessage | None:
    db = SessionLocal()
    try:
        sender_uuid = uuid.UUID(sender_id)
        recipient_uuid = uuid.UUID(recipient_id)
    except (ValueError, TypeError):
        return None
    try:
        friendship = db.scalar(
            select(Friendship).where(
                and_(
                    Friendship.user_id == sender_uuid,
                    Friendship.friend_id == recipient_uuid,
                )
            )
        )
        if not friendship:
            return None
        if db.scalar(
            select(UserBlock).where(
                or_(
                    and_(
                        UserBlock.blocker_id == sender_uuid,
                        UserBlock.blocked_id == recipient_uuid,
                    ),
                    and_(
                        UserBlock.blocker_id == recipient_uuid,
                        UserBlock.blocked_id == sender_uuid,
                    ),
                )
            )
        ):
            return None
        msg = FriendMessage(
            sender_id=sender_uuid,
            recipient_id=recipient_uuid,
            message=message,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg
    finally:
        db.close()


def _get_profile_name(user_id: str) -> str:
    db = SessionLocal()
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        return "New message"
    try:
        profile = db.scalar(select(Profile).where(Profile.user_id == user_uuid))
        return profile.display_name if profile else "New message"
    finally:
        db.close()


async def notify_friends_presence(user_id: str, is_online: bool) -> None:
    friend_ids = await asyncio.to_thread(_fetch_friend_ids, user_id)
    payload = {"userId": user_id, "isOnline": is_online}
    for friend_id in friend_ids:
        for sid in state.get_user_sids(friend_id):
            await sio.emit("friends:presence", payload, room=sid)


async def emit_chat_history(sid: str, table_id: str) -> None:
    async with state_lock:
        messages = state.get_chat_history(table_id)
    await sio.emit("chat:history", {"tableId": table_id, "messages": messages}, room=sid)


async def broadcast_chat_message(table_id: str, message: ChatMessage) -> None:
    async with state_lock:
        payload = state.add_chat_message(table_id, message)
    if payload:
        await sio.emit("chat:message", payload, room=table_room(table_id))


async def broadcast_system_message(table_id: str, message: str) -> None:
    system_message = ChatMessage(
        message_id=uuid.uuid4().hex,
        table_id=table_id,
        user_id=None,
        display_name="System",
        message=message,
        created_at=datetime.now(timezone.utc),
        system=True,
    )
    await broadcast_chat_message(table_id, system_message)


async def emit_game_state(table_id: str) -> None:
    table = state.tables.get(table_id)
    if not table or not table.game:
        return
    snapshot = table.game.snapshot()
    await sio.emit("game:state", snapshot, room=table_room(table_id))


async def log_game_events(table_id: str, round_id: str | None, events: list[dict]) -> None:
    if not events:
        return
    for event in events:
        if event.get("action") == "round_start" and round_id:
            await asyncio.to_thread(record_round_start, table_id, round_id, event.get("created_at"))
        if event.get("action") == "round_end" and round_id:
            await asyncio.to_thread(
                record_round_end,
                table_id,
                round_id,
                event.get("payload", {}).get("summary", {}),
            )
        await asyncio.to_thread(record_action, event)


def _set_turn_deadline(table_id: str) -> int | None:
    table = state.tables.get(table_id)
    if not table or not table.game:
        return None
    game = table.game
    if not game.active_player_id:
        game.turn_ends_at = None
        return None
    game.turn_ends_at = datetime.now(timezone.utc) + timedelta(seconds=TURN_TIMEOUT_SECONDS)
    return game.turn_token


async def schedule_turn_timeout(table_id: str, token: int | None) -> None:
    if token is None:
        return

    await asyncio.sleep(TURN_TIMEOUT_SECONDS)
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            return
        if table.is_paused:
            return
        game = table.game
        if game.turn_token != token or not game.active_player_id:
            return
        error = game.stand(game.active_player_id, auto=True)
        events = game.consume_events()
        round_id = game.round_id
        if error:
            await sio.emit("game:error", {"message": error}, room=table_room(table_id))
        token = _set_turn_deadline(table_id)

    await log_game_events(table_id, round_id, events)
    await emit_game_state(table_id)
    if token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))


def table_room(table_id: str) -> str:
    return f"table:{table_id}"


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None) -> bool:
    token = None
    if isinstance(auth, dict):
        token = auth.get("token") or auth.get("accessToken")

    user = await asyncio.to_thread(get_socket_user, token)
    if not user:
        return False

    async with state_lock:
        player = state.register_player(sid, user.user_id, user.display_name, user.muted_until)
        tables = state.list_tables()
        table_id = state.get_user_table(user.user_id)

    await sio.save_session(
        sid,
        {
            "user_id": player.user_id,
            "display_name": player.display_name,
        },
    )
    await sio.enter_room(sid, LOBBY_ROOM)
    await sio.emit("lobby:snapshot", {"tables": tables}, room=sid)
    if table_id:
        await sio.enter_room(sid, table_room(table_id))
        await emit_game_state(table_id)
        await emit_chat_history(sid, table_id)
    asyncio.create_task(notify_friends_presence(player.user_id, True))
    return True


@sio.event
async def disconnect(sid: str) -> None:
    token = None
    display_name = None
    user_id = None
    still_online = False
    async with state_lock:
        player = state.get_player(sid)
        display_name = player.display_name if player else None
        user_id = player.user_id if player else None
        table_id, table, removed = state.unregister_player(sid)
        still_online = state.is_user_online(user_id) if user_id else False
        tables = state.list_tables()
        table_snapshot = table.snapshot() if table and not removed else None
        if table_id and table and table.game:
            token = _set_turn_deadline(table_id)

    if table_id and table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
        if display_name:
            await broadcast_system_message(table_id, f"{display_name} left the table.")
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
    if table_id and token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))
    if user_id and not still_online:
        asyncio.create_task(notify_friends_presence(user_id, False))


@sio.on("lobby:list")
async def lobby_list(sid: str) -> None:
    async with state_lock:
        tables = state.list_tables()
    await sio.emit("lobby:snapshot", {"tables": tables}, room=sid)


@sio.on("table:create")
async def table_create(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    name = str(payload.get("name") or "").strip()
    is_private = bool(payload.get("isPrivate", False))
    try:
        max_players = int(payload.get("maxPlayers") or MAX_TABLE_PLAYERS)
    except (TypeError, ValueError):
        max_players = MAX_TABLE_PLAYERS
    min_bet = _parse_int(payload.get("minBet"), 10, 1, 1000)
    max_bet = _parse_int(payload.get("maxBet"), 500, 1, 10000)
    if max_bet < min_bet:
        max_bet = min_bet
    decks = _parse_int(payload.get("decks"), 6, 1, 8)
    starting_bank = _parse_int(payload.get("startingBank"), 2500, 100, 100000)
    dealer_hits_soft_17 = bool(payload.get("dealerHitsSoft17", False))
    if starting_bank < min_bet:
        starting_bank = min_bet
    table_config = TableConfig(
        min_bet=min_bet,
        max_bet=max_bet,
        decks=decks,
        starting_bank=starting_bank,
        dealer_hits_soft_17=dealer_hits_soft_17,
    )

    player_display_name = None
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        player_display_name = player.display_name
        prev_table_id, prev_table, prev_removed = state.remove_from_table(player)
        table = state.create_table(player, name, is_private, max_players, table_config)
        state.ensure_game(table)
        tables = state.list_tables()
        table_snapshot = table.snapshot()
        prev_snapshot = prev_table.snapshot() if prev_table and not prev_removed else None

    if prev_table_id:
        await sio.leave_room(sid, table_room(prev_table_id))
        if prev_snapshot:
            await sio.emit("table:state", prev_snapshot, room=table_room(prev_table_id))

    await sio.enter_room(sid, table_room(table.table_id))
    await sio.emit("table:joined", {"tableId": table.table_id}, room=sid)
    await sio.emit("table:state", table_snapshot, room=table_room(table.table_id))
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
    await emit_game_state(table.table_id)
    await emit_chat_history(sid, table.table_id)
    if player_display_name:
        await broadcast_system_message(
            table.table_id,
            f"{player_display_name} created the table.",
        )


@sio.on("table:join")
async def table_join(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    table_id = str(payload.get("tableId") or "").strip()
    invite_code = str(payload.get("inviteCode") or payload.get("code") or "").strip()

    error = None
    prev_table_id = None
    prev_snapshot = None
    table_snapshot = None
    resolved_id = table_id
    player_display_name = None
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        player_display_name = player.display_name
        try:
            if not resolved_id and invite_code:
                resolved_id = state.resolve_invite_code(invite_code)
                if not resolved_id:
                    raise TableError("invalid_code", "Invite code not found")
            if not resolved_id:
                raise TableError("invalid", "Missing table id")

            table = state.tables.get(resolved_id)
            if not table:
                raise TableError("not_found", "Table not found")

            current_table_id = state.get_user_table(player.user_id)
            if table.is_private and not invite_code and current_table_id != resolved_id:
                raise TableError("private", "Invite code required")

            table, prev_table_id, prev_table, prev_removed = state.move_to_table(
                player,
                resolved_id,
            )
            state.ensure_game(table)
            table_snapshot = table.snapshot()
            prev_snapshot = prev_table.snapshot() if prev_table and not prev_removed else None
        except TableError as exc:
            error = {"code": exc.code, "message": str(exc)}
        tables = state.list_tables()

    if error:
        await sio.emit("table:error", error, room=sid)
        await sio.emit("lobby:snapshot", {"tables": tables}, room=sid)
        return

    if prev_table_id:
        await sio.leave_room(sid, table_room(prev_table_id))
        if prev_snapshot:
            await sio.emit("table:state", prev_snapshot, room=table_room(prev_table_id))

    await sio.enter_room(sid, table_room(resolved_id))
    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(resolved_id))
    await sio.emit("table:joined", {"tableId": resolved_id}, room=sid)
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
    await emit_game_state(resolved_id)
    await emit_chat_history(sid, resolved_id)
    if player_display_name:
        await broadcast_system_message(
            resolved_id,
            f"{player_display_name} joined the table.",
        )


@sio.on("table:leave")
async def table_leave(sid: str) -> None:
    token = None
    display_name = None
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        display_name = player.display_name
        table_id, table, removed = state.remove_from_table(player)
        tables = state.list_tables()
        table_snapshot = table.snapshot() if table and not removed else None
        if table_id and table and table.game:
            token = _set_turn_deadline(table_id)

    if table_id:
        await sio.leave_room(sid, table_room(table_id))
        if table_snapshot:
            await sio.emit("table:state", table_snapshot, room=table_room(table_id))
            if display_name:
                await broadcast_system_message(table_id, f"{display_name} left the table.")
        await emit_game_state(table_id)
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
    if table_id and token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))


@sio.on("table:pause")
async def table_pause(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    paused = bool(payload.get("paused", True))
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    table_id = None
    table_snapshot = None
    tables = []
    token = None
    async with state_lock:
        table_id = state.get_user_table(user_id)
        table = state.tables.get(table_id) if table_id else None
        if not table:
            return
        if not _is_owner(table, user_id):
            error = "Only the table owner can pause the table."
        else:
            table.is_paused = paused
            if table.game:
                if paused:
                    table.game.turn_ends_at = None
                else:
                    token = _set_turn_deadline(table_id)
            table_snapshot = table.snapshot()
            tables = state.list_tables()

    if error:
        await sio.emit("table:error", {"message": error}, room=sid)
        return
    if table_snapshot and table_id:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
        await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
        await emit_game_state(table_id)
        if token:
            asyncio.create_task(schedule_turn_timeout(table_id, token))


@sio.on("table:betting")
async def table_betting(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    locked = bool(payload.get("locked", True))
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    table_id = None
    table_snapshot = None
    tables = []
    async with state_lock:
        table_id = state.get_user_table(user_id)
        table = state.tables.get(table_id) if table_id else None
        if not table:
            return
        if not _is_owner(table, user_id):
            error = "Only the table owner can lock betting."
        else:
            table.betting_locked = locked
            table_snapshot = table.snapshot()
            tables = state.list_tables()

    if error:
        await sio.emit("table:error", {"message": error}, room=sid)
        return
    if table_snapshot and table_id:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
        await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)


@sio.on("table:kick")
async def table_kick(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    target_user_id = str(payload.get("userId") or "").strip()
    if not target_user_id:
        return

    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    table_id = None
    table_snapshot = None
    tables = []
    target_sid = None
    target_name = None
    async with state_lock:
        table_id = state.get_user_table(user_id)
        table = state.tables.get(table_id) if table_id else None
        if not table:
            return
        if not _is_owner(table, user_id):
            error = "Only the table owner can remove players."
        elif target_user_id == user_id:
            error = "You cannot remove yourself."
        else:
            target_player = table.players.get(target_user_id)
            if not target_player:
                error = "Player not found."
            else:
                target_sid = target_player.sid
                target_name = target_player.display_name
                _, updated_table, removed = state.remove_from_table(target_player)
                table_snapshot = (
                    updated_table.snapshot() if updated_table and not removed else None
                )
                tables = state.list_tables()

    if error:
        await sio.emit("table:error", {"message": error}, room=sid)
        return

    if target_sid and table_id:
        await sio.leave_room(target_sid, table_room(table_id))
        await sio.emit("table:kicked", {}, room=target_sid)
        await sio.emit("lobby:snapshot", {"tables": tables}, room=target_sid)

    if table_snapshot and table_id:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
        await emit_game_state(table_id)
        if target_name:
            await broadcast_system_message(table_id, f"{target_name} was removed from the table.")
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)


@sio.on("table:mute")
async def table_mute(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    target_user_id = str(payload.get("userId") or "").strip()
    duration = _parse_int(payload.get("durationSeconds"), 300, MUTE_MIN_SECONDS, MUTE_MAX_SECONDS)
    if not target_user_id:
        return

    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    table_id = None
    target_sid = None
    target_name = None
    async with state_lock:
        table_id = state.get_user_table(user_id)
        table = state.tables.get(table_id) if table_id else None
        if not table:
            return
        if not _is_owner(table, user_id):
            error = "Only the table owner can mute players."
        else:
            target_player = table.players.get(target_user_id)
            if not target_player:
                error = "Player not found."
            else:
                target_player.muted_until = datetime.now(timezone.utc) + timedelta(seconds=duration)
                target_sid = target_player.sid
                target_name = target_player.display_name

    if error:
        await sio.emit("table:error", {"message": error}, room=sid)
        return

    if target_sid:
        await sio.emit(
            "chat:error",
            {"message": f"You have been muted for {duration} seconds."},
            room=target_sid,
        )
    if table_id and target_name:
        await broadcast_system_message(
            table_id,
            f"{target_name} was muted for {duration} seconds.",
        )

@sio.on("table:ready")
async def table_ready(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    is_ready = bool(payload.get("ready", False))

    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        table = state.set_ready(player, is_ready)
        table_snapshot = table.snapshot() if table else None

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_snapshot["id"]))


@sio.on("chat:sync")
async def chat_sync(sid: str) -> None:
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return
    async with state_lock:
        table_id = state.get_user_table(user_id)
        if not table_id:
            return
        messages = state.get_chat_history(table_id)
    await sio.emit("chat:history", {"tableId": table_id, "messages": messages}, room=sid)


@sio.on("chat:send")
async def chat_send(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    message = str(payload.get("message") or "").strip()
    if not message:
        return
    if len(message) > CHAT_MESSAGE_LIMIT:
        await sio.emit(
            "chat:error",
            {"message": f"Message too long (max {CHAT_MESSAGE_LIMIT} characters)."},
            room=sid,
        )
        return

    error_message = None
    table_id = None
    chat_payload = None
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            await sio.emit("chat:error", {"message": "Chat session not found."}, room=sid)
            return
        table_id = state.get_user_table(player.user_id)
        if not table_id:
            await sio.emit(
                "chat:error",
                {"message": "Join a table before sending chat messages."},
                room=sid,
            )
            return
        now = datetime.now(timezone.utc)
        if player.muted_until and player.muted_until > now:
            error_message = "You are muted."
        elif player.muted_until and player.muted_until <= now:
            player.muted_until = None
        elif player.last_chat_at and (
            now - player.last_chat_at
        ).total_seconds() < CHAT_RATE_LIMIT_SECONDS:
            error_message = "You're sending messages too fast."
        else:
            player.last_chat_at = now
            chat_message = ChatMessage(
                message_id=uuid.uuid4().hex,
                table_id=table_id,
                user_id=player.user_id,
                display_name=player.display_name,
                message=message,
                created_at=now,
            )
            chat_payload = state.add_chat_message(table_id, chat_message)

    if error_message:
        await sio.emit("chat:error", {"message": error_message}, room=sid)
        return
    if chat_payload and table_id:
        await sio.emit("chat:message", chat_payload, room=table_room(table_id))


@sio.on("friends:send")
async def friends_send(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    recipient_id = str(payload.get("userId") or "").strip()
    message = str(payload.get("message") or "").strip()
    if not recipient_id or not message:
        return
    if len(message) > FRIEND_MESSAGE_LIMIT:
        await sio.emit(
            "friends:error",
            {"message": f"Message too long (max {FRIEND_MESSAGE_LIMIT} characters)."},
            room=sid,
        )
        return

    session = await sio.get_session(sid)
    sender_id = session.get("user_id") if session else None
    if not sender_id or sender_id == recipient_id:
        return

    if await asyncio.to_thread(_is_blocked_pair, sender_id, recipient_id):
        await sio.emit("friends:error", {"message": "Message blocked."}, room=sid)
        return

    msg = await asyncio.to_thread(_persist_friend_message, sender_id, recipient_id, message)
    if not msg:
        await sio.emit("friends:error", {"message": "Unable to send message."}, room=sid)
        return

    payload = {
        "id": str(msg.id),
        "senderId": str(msg.sender_id),
        "recipientId": str(msg.recipient_id),
        "message": msg.message,
        "readAt": msg.read_at.isoformat() if msg.read_at else None,
        "createdAt": msg.created_at.isoformat(),
    }
    await sio.emit("friends:message", payload, room=sid)
    for target_sid in state.get_user_sids(recipient_id):
        await sio.emit("friends:message", payload, room=target_sid)

    if not state.is_user_online(recipient_id):
        title = await asyncio.to_thread(_get_profile_name, sender_id)
        db = SessionLocal()
        try:
            send_push_to_user(
                db,
                uuid.UUID(recipient_id),
                {"title": title, "body": msg.message, "url": "/friends"},
            )
        finally:
            db.close()


@sio.on("friends:typing")
async def friends_typing(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    recipient_id = str(payload.get("userId") or "").strip()
    is_typing = bool(payload.get("isTyping", False))
    session = await sio.get_session(sid)
    sender_id = session.get("user_id") if session else None
    if not sender_id or not recipient_id:
        return
    if await asyncio.to_thread(_is_blocked_pair, sender_id, recipient_id):
        return
    friend_ids = await asyncio.to_thread(_fetch_friend_ids, sender_id)
    if recipient_id not in friend_ids:
        return
    for target_sid in state.get_user_sids(recipient_id):
        await sio.emit(
            "friends:typing",
            {"userId": sender_id, "isTyping": is_typing},
            room=target_sid,
        )


@sio.on("friends:read")
async def friends_read(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    recipient_id = str(payload.get("userId") or "").strip()
    read_at = payload.get("readAt")
    session = await sio.get_session(sid)
    sender_id = session.get("user_id") if session else None
    if not sender_id or not recipient_id or not read_at:
        return
    for target_sid in state.get_user_sids(recipient_id):
        await sio.emit(
            "friends:read",
            {"userId": sender_id, "readAt": read_at},
            room=target_sid,
        )


@sio.on("game:sync")
async def game_sync(sid: str) -> None:
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return
    async with state_lock:
        table_id = state.get_user_table(user_id)
    if table_id:
        await emit_game_state(table_id)


@sio.on("game:start")
async def game_start(sid: str) -> None:
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    async with state_lock:
        table_id = state.get_user_table(user_id)
        if not table_id:
            return
        table = state.tables.get(table_id)
        if not table:
            return
        if table.is_paused:
            error = "Table is paused."
        elif table.betting_locked:
            error = "Betting is locked."
        elif any(not player.is_ready for player in table.players.values()):
            error = "All players must be ready."
        else:
            game = state.ensure_game(table)
            error = game.start_round()
            events = game.consume_events()
            round_id = game.round_id
            token = _set_turn_deadline(table_id)
    if error:
        await sio.emit("game:error", {"message": error}, room=sid)
        return
    await log_game_events(table_id, round_id, events)
    await emit_game_state(table_id)
    if token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))


@sio.on("game:action")
async def game_action(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    action = str(payload.get("action") or "").strip().lower()
    if not action:
        return
    provided_turn_token = payload.get("turnToken")
    provided_round_id = payload.get("roundId")

    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    token: int | None = None
    table_id = None
    events: list[dict] = []
    round_id = None
    async with state_lock:
        table_id = state.get_user_table(user_id)
        if not table_id:
            return
        table = state.tables.get(table_id)
        if not table or not table.game:
            return
        player = state.get_player(sid)
        now = datetime.now(timezone.utc)
        if player:
            if player.last_action_at and (
                now - player.last_action_at
            ).total_seconds() < GAME_ACTION_RATE_LIMIT_SECONDS:
                error = "Actions sent too fast."
            else:
                player.last_action_at = now
        if error:
            round_id = table.game.round_id
            token = _set_turn_deadline(table_id)
        elif table.is_paused:
            error = "Table is paused."
            round_id = table.game.round_id
            table.game.turn_ends_at = None
            token = None
        else:
            game = table.game
            if provided_round_id is None or provided_turn_token is None:
                error = "Missing action token."
            elif provided_round_id != game.round_id:
                error = "Stale action (round mismatch)."
            elif provided_turn_token != game.turn_token:
                error = "Stale action (turn mismatch)."
            elif action == "hit":
                error = game.hit(user_id)
            elif action == "stand":
                error = game.stand(user_id)
            elif action == "double":
                error = game.double_down(user_id)
            elif action == "split":
                error = game.split(user_id)
            else:
                error = "Unknown action."

            events = game.consume_events()
            round_id = game.round_id
            token = _set_turn_deadline(table_id)

    if error:
        await sio.emit("game:error", {"message": error}, room=sid)
    await log_game_events(table_id, round_id, events)
    await emit_game_state(table_id)
    if token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))
