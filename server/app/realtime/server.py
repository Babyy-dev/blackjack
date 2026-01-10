from __future__ import annotations

import asyncio

import socketio

from app.core.config import settings
from app.realtime.auth import get_socket_user
from app.realtime.state import (
    MAX_TABLE_PLAYERS,
    LobbyState,
    TableError,
)

LOBBY_ROOM = "lobby"

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins,
    client_manager=socketio.AsyncRedisManager(settings.redis_url),
)

state = LobbyState()
state_lock = asyncio.Lock()


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
    async with state_lock:
        table_id, table, removed = state.unregister_player(sid)
        tables = state.list_tables()
        table_snapshot = table.snapshot() if table and not removed else None

    if table_id and table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)


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


@sio.on("table:join")
async def table_join(sid: str, payload: dict | None) -> None:
    payload = payload or {}
    table_id = str(payload.get("tableId") or "").strip()
    if not table_id:
        await sio.emit(
            "table:error",
            {"code": "invalid", "message": "Missing table id"},
            room=sid,
        )
        return

    error = None
    prev_table_id = None
    prev_snapshot = None
    table_snapshot = None
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        try:
            table, prev_table_id, prev_table, prev_removed = state.move_to_table(
                player,
                table_id,
            )
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

    await sio.enter_room(sid, table_room(table_id))
    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await sio.emit("table:joined", {"tableId": table_id}, room=sid)
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)


@sio.on("table:leave")
async def table_leave(sid: str) -> None:
    async with state_lock:
        player = state.get_player(sid)
        if not player:
            return
        table_id, table, removed = state.remove_from_table(player)
        tables = state.list_tables()
        table_snapshot = table.snapshot() if table and not removed else None

    if table_id:
        await sio.leave_room(sid, table_room(table_id))
        if table_snapshot:
            await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await sio.emit("lobby:snapshot", {"tables": tables}, room=LOBBY_ROOM)


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
