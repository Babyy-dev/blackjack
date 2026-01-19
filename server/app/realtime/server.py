from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import socketio

from app.core.config import settings
from app.realtime.auth import get_socket_user
from app.realtime.game_logging import record_action, record_round_end, record_round_start
from app.realtime.state import (
    MAX_TABLE_PLAYERS,
    LobbyState,
    TableError,
)

LOBBY_ROOM = "lobby"
TURN_TIMEOUT_SECONDS = 25

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins,
    client_manager=socketio.AsyncRedisManager(settings.redis_url),
)

state = LobbyState()
state_lock = asyncio.Lock()


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
        player = state.register_player(sid, user.user_id, user.display_name)
        tables = state.list_tables()

    await sio.save_session(
        sid,
        {
            "user_id": player.user_id,
            "display_name": player.display_name,
        },
    )
    await sio.enter_room(sid, LOBBY_ROOM)
    await sio.emit("lobby:snapshot", {"tables": tables}, room=sid)
    return True


@sio.event
async def disconnect(sid: str) -> None:
    token = None
    async with state_lock:
        table_id, table, removed = state.unregister_player(sid)
        tables = state.list_tables()
        table_snapshot = table.snapshot() if table and not removed else None
        if table_id and table and table.game:
            token = _set_turn_deadline(table_id)

    if table_id and table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
    if table_id and token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))


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

    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        prev_table_id, prev_table, prev_removed = state.remove_from_table(player)
        table = state.create_table(player, name, is_private, max_players)
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
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
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


@sio.on("table:leave")
async def table_leave(sid: str) -> None:
    token = None
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        table_id, table, removed = state.remove_from_table(player)
        tables = state.list_tables()
        table_snapshot = table.snapshot() if table and not removed else None
        if table_id and table and table.game:
            token = _set_turn_deadline(table_id)

    if table_id:
        await sio.leave_room(sid, table_room(table_id))
        if table_snapshot:
            await sio.emit("table:state", table_snapshot, room=table_room(table_id))
        await emit_game_state(table_id)
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)
    if table_id and token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))


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
        if any(not player.is_ready for player in table.players.values()):
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

    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if not user_id:
        return

    error = None
    token: int | None = None
    table_id = None
    async with state_lock:
        table_id = state.get_user_table(user_id)
        if not table_id:
            return
        table = state.tables.get(table_id)
        if not table or not table.game:
            return
        game = table.game
        if action == "hit":
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
