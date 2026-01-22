from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db, require_admin
from app.db.models import (
    AdminActionLog,
    CryptoDeposit,
    CryptoWithdrawal,
    GameActionLog,
    User,
    UserSession,
    Wallet,
    WalletTransaction,
)
from app.schemas.admin import (
    AdminActionLogEntry,
    AdminCryptoDeposit,
    AdminCryptoWithdrawal,
    AdminForceStandRequest,
    AdminForceResultRequest,
    AdminGameActionLogEntry,
    AdminOverview,
    AdminSessionResetResponse,
    AdminTableDetail,
    AdminTableKickRequest,
    AdminTableRulesUpdateRequest,
    AdminTableSummary,
    AdminUserBanRequest,
    AdminUserMuteRequest,
    AdminUser,
    AdminUserUpdateRequest,
    AdminWithdrawalActionRequest,
    AdminWalletAdjustmentRequest,
    AdminWalletAdjustmentResponse,
)
from app.schemas.wallet import WalletSummary, WalletTransactionPublic
from app.realtime.server import (
    LOBBY_ROOM,
    emit_game_state,
    log_game_events,
    schedule_turn_timeout,
    sio,
    state,
    state_lock,
    table_room,
    _set_turn_deadline,
)

router = APIRouter()


def build_admin_user(user: User) -> AdminUser:
    display_name = user.profile.display_name if user.profile else user.email.split("@")[0]
    wallet_balance = user.wallet.balance if user.wallet else 0
    return AdminUser(
        id=user.id,
        email=user.email,
        display_name=display_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_banned=user.is_banned,
        banned_until=user.banned_until,
        muted_until=user.muted_until,
        role=user.role,
        created_at=user.created_at,
        wallet_balance=wallet_balance,
    )


def ensure_wallet(db: Session, user: User) -> Wallet:
    wallet = user.wallet
    if wallet:
        return wallet
    wallet = db.scalar(select(Wallet).where(Wallet.user_id == user.id))
    if wallet:
        return wallet
    wallet = Wallet(user_id=user.id, balance=0, currency="TOKEN")
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def add_admin_log(
    db: Session,
    admin: User,
    action: str,
    *,
    target_user_id: uuid.UUID | None = None,
    target_table_id: str | None = None,
    payload: dict | None = None,
) -> AdminActionLog:
    log = AdminActionLog(
        admin_id=admin.id,
        action=action,
        target_user_id=target_user_id,
        target_table_id=target_table_id,
        payload=payload or {},
    )
    db.add(log)
    return log


def build_table_summary(table) -> AdminTableSummary:
    game = table.game
    return AdminTableSummary(
        id=table.table_id,
        name=table.name,
        is_private=table.is_private,
        max_players=table.max_players,
        player_count=len(table.players),
        invite_code=table.invite_code,
        round_active=game.is_round_active() if game else False,
        is_paused=getattr(table, "is_paused", False),
        betting_locked=getattr(table, "betting_locked", False),
        min_bet=table.config.min_bet if hasattr(table, "config") else None,
        max_bet=table.config.max_bet if hasattr(table, "config") else None,
        decks=table.config.decks if hasattr(table, "config") else None,
        starting_bank=table.config.starting_bank if hasattr(table, "config") else None,
    )


def build_table_detail(table) -> AdminTableDetail:
    summary = build_table_summary(table)
    players = [
        {
            "user_id": player.user_id,
            "display_name": player.display_name,
            "is_ready": player.is_ready,
        }
        for player in table.players.values()
    ]
    game_state = table.game.snapshot() if table.game else None
    return AdminTableDetail(table=summary, players=players, game_state=game_state)


def build_table_detail_from_snapshot(
    snapshot: dict,
    game_state: dict | None,
) -> AdminTableDetail:
    return AdminTableDetail(
        table=AdminTableSummary(
            id=snapshot["id"],
            name=snapshot["name"],
            is_private=snapshot["isPrivate"],
            max_players=snapshot["maxPlayers"],
            player_count=len(snapshot["players"]),
            invite_code=snapshot.get("inviteCode"),
            round_active=bool(
                game_state and game_state.get("status") not in {"waiting", "round_end"}
            ),
            is_paused=bool(snapshot.get("isPaused", False)),
            betting_locked=bool(snapshot.get("bettingLocked", False)),
            min_bet=snapshot.get("minBet"),
            max_bet=snapshot.get("maxBet"),
            decks=snapshot.get("decks"),
            starting_bank=snapshot.get("startingBank"),
        ),
        players=[
            {
                "user_id": player["userId"],
                "display_name": player["displayName"],
                "is_ready": player["isReady"],
            }
            for player in snapshot["players"]
        ],
        game_state=game_state,
    )


def parse_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


async def remove_user_from_tables(user_id: str) -> None:
    removed_table_id = None
    table_snapshot = None
    tables_payload = None
    player_sid = None
    token = None
    async with state_lock:
        player = next(
            (candidate for candidate in state.sid_to_player.values() if candidate.user_id == user_id),
            None,
        )
        if not player:
            return
        player_sid = player.sid
        removed_table_id, table, removed = state.remove_from_table(player)
        table_snapshot = table.snapshot() if table and not removed else None
        tables_payload = state.list_tables()
        if removed_table_id and table and table.game:
            token = _set_turn_deadline(removed_table_id)

    if player_sid and removed_table_id:
        await sio.leave_room(player_sid, table_room(removed_table_id))
        await sio.emit("table:kicked", {"tableId": removed_table_id}, room=player_sid)
        await sio.disconnect(player_sid)
    if removed_table_id and table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(removed_table_id))
        await emit_game_state(removed_table_id)
    if tables_payload is not None:
        await sio.emit("lobby:snapshot", {"tables": tables_payload}, room=LOBBY_ROOM)
    if token and removed_table_id:
        asyncio.create_task(schedule_turn_timeout(removed_table_id, token))


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminOverview:
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=1)

    user_count = db.scalar(select(func.count(User.id))) or 0
    active_sessions = db.scalar(
        select(func.count(UserSession.id)).where(
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    ) or 0
    wallet_count = db.scalar(select(func.count(Wallet.id))) or 0
    recent_transactions = db.scalar(
        select(func.count(WalletTransaction.id)).where(
            WalletTransaction.created_at > recent_cutoff
        )
    ) or 0

    return AdminOverview(
        user_count=int(user_count),
        active_sessions=int(active_sessions),
        wallet_count=int(wallet_count),
        recent_transactions=int(recent_transactions),
        generated_at=now,
    )


@router.get("/users", response_model=list[AdminUser])
def admin_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminUser]:
    users = db.scalars(
        select(User)
        .options(selectinload(User.profile), selectinload(User.wallet))
        .order_by(User.created_at.desc())
        .limit(50)
    ).all()

    return [build_admin_user(user) for user in users]


@router.patch("/users/{user_id}", response_model=AdminUser)
def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminUser:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    previous = {"is_active": user.is_active, "is_admin": user.is_admin}
    changes: dict[str, bool] = {}
    if payload.is_active is not None:
        user.is_active = payload.is_active
        changes["is_active"] = payload.is_active
    if payload.is_admin is not None:
        user.is_admin = payload.is_admin
        changes["is_admin"] = payload.is_admin

    if changes:
        add_admin_log(
            db,
            admin_user,
            "user.update",
            target_user_id=user_id,
            payload={"previous": previous, "changes": changes},
        )
    db.commit()
    db.refresh(user)
    return build_admin_user(user)


@router.post("/users/{user_id}/mute", response_model=AdminUser)
async def mute_user(
    user_id: uuid.UUID,
    payload: AdminUserMuteRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminUser:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.muted_until = datetime.now(timezone.utc) + timedelta(minutes=payload.minutes)
    add_admin_log(
        db,
        admin_user,
        "user.mute",
        target_user_id=user_id,
        payload={"minutes": payload.minutes, "muted_until": user.muted_until.isoformat()},
    )
    db.commit()
    db.refresh(user)
    async with state_lock:
        for player in state.sid_to_player.values():
            if player.user_id == str(user.id):
                player.muted_until = user.muted_until
    return build_admin_user(user)


@router.post("/users/{user_id}/unmute", response_model=AdminUser)
async def unmute_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminUser:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.muted_until = None
    add_admin_log(db, admin_user, "user.unmute", target_user_id=user_id)
    db.commit()
    db.refresh(user)
    async with state_lock:
        for player in state.sid_to_player.values():
            if player.user_id == str(user.id):
                player.muted_until = None
    return build_admin_user(user)


@router.post("/users/{user_id}/ban", response_model=AdminUser)
async def ban_user(
    user_id: uuid.UUID,
    payload: AdminUserBanRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminUser:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_banned = True
    user.is_active = False
    user.banned_until = (
        datetime.now(timezone.utc) + timedelta(minutes=payload.minutes)
        if payload.minutes
        else None
    )
    add_admin_log(
        db,
        admin_user,
        "user.ban",
        target_user_id=user_id,
        payload={
            "minutes": payload.minutes,
            "banned_until": user.banned_until.isoformat() if user.banned_until else None,
        },
    )
    db.commit()
    db.refresh(user)
    await remove_user_from_tables(str(user.id))
    return build_admin_user(user)


@router.post("/users/{user_id}/unban", response_model=AdminUser)
async def unban_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminUser:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_banned = False
    user.banned_until = None
    user.is_active = True
    add_admin_log(db, admin_user, "user.unban", target_user_id=user_id)
    db.commit()
    db.refresh(user)
    return build_admin_user(user)


@router.post("/users/{user_id}/sessions/revoke", response_model=AdminSessionResetResponse)
def revoke_user_sessions(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminSessionResetResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    now = datetime.now(timezone.utc)
    sessions = db.scalars(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        )
    ).all()
    for session in sessions:
        session.revoked_at = now
    add_admin_log(
        db,
        admin_user,
        "session.revoke",
        target_user_id=user_id,
        payload={"revoked": len(sessions)},
    )
    db.commit()
    return AdminSessionResetResponse(revoked=len(sessions))


@router.post("/users/{user_id}/wallet/adjust", response_model=AdminWalletAdjustmentResponse)
def adjust_wallet(
    user_id: uuid.UUID,
    payload: AdminWalletAdjustmentRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminWalletAdjustmentResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    wallet = ensure_wallet(db, user)
    action = payload.action
    amount = payload.amount
    if action in {"credit", "debit"} and amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be greater than 0")
    if action == "set" and amount < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be 0 or greater")

    if action == "credit":
        delta = amount
        kind = "admin_credit"
    elif action == "debit":
        delta = -amount
        kind = "admin_debit"
    else:
        delta = amount - wallet.balance
        kind = "admin_set"

    if wallet.balance + delta < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance for adjustment",
        )

    wallet.balance += delta
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        amount=delta,
        kind=kind,
        status="completed",
    )
    db.add(transaction)
    add_admin_log(
        db,
        admin_user,
        "wallet.adjust",
        target_user_id=user_id,
        payload={
            "action": action,
            "amount": amount,
            "delta": delta,
            "reason": payload.reason,
            "balance_after": wallet.balance,
        },
    )
    db.commit()
    db.refresh(wallet)
    db.refresh(transaction)

    return AdminWalletAdjustmentResponse(
        wallet=WalletSummary.model_validate(wallet),
        transaction=WalletTransactionPublic.model_validate(transaction),
    )


@router.get("/logs", response_model=list[AdminActionLogEntry])
def admin_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminActionLogEntry]:
    logs = db.scalars(
        select(AdminActionLog)
        .order_by(AdminActionLog.created_at.desc())
        .limit(min(limit, 500))
    ).all()
    return [AdminActionLogEntry.model_validate(log) for log in logs]


@router.get("/game-logs", response_model=list[AdminGameActionLogEntry])
def admin_game_logs(
    table_id: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminGameActionLogEntry]:
    query = select(GameActionLog).order_by(GameActionLog.created_at.desc())
    if table_id:
        query = query.where(GameActionLog.table_id == table_id)
    logs = db.scalars(query.limit(min(limit, 500))).all()
    return [AdminGameActionLogEntry.model_validate(log) for log in logs]


@router.get("/tables", response_model=list[AdminTableSummary])
async def admin_tables(
    _: User = Depends(require_admin),
) -> list[AdminTableSummary]:
    async with state_lock:
        tables = list(state.tables.values())
        return [build_table_summary(table) for table in tables]


@router.get("/tables/{table_id}", response_model=AdminTableDetail)
async def admin_table_detail(
    table_id: str,
    _: User = Depends(require_admin),
) -> AdminTableDetail:
    async with state_lock:
        table = state.tables.get(table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        return build_table_detail(table)


@router.post("/tables/{table_id}/pause", response_model=AdminTableDetail)
async def admin_table_pause(
    table_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table.is_paused = True
        table.game.turn_ends_at = None
        table_snapshot = table.snapshot()
        game_state = table.game.snapshot()

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)

    add_admin_log(db, admin_user, "table.pause", target_table_id=table_id)
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/resume", response_model=AdminTableDetail)
async def admin_table_resume(
    table_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    token = None
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table.is_paused = False
        token = _set_turn_deadline(table_id)
        table_snapshot = table.snapshot()
        game_state = table.game.snapshot()

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)
    if token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))

    add_admin_log(db, admin_user, "table.resume", target_table_id=table_id)
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/restart", response_model=AdminTableDetail)
async def admin_table_restart(
    table_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table.game = None
        for player in table.players.values():
            player.is_ready = False
        state.ensure_game(table)
        table_snapshot = table.snapshot()
        game_state = table.game.snapshot() if table.game else None

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)

    add_admin_log(db, admin_user, "table.restart", target_table_id=table_id)
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/lock-betting", response_model=AdminTableDetail)
async def admin_lock_betting(
    table_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table.betting_locked = True
        table_snapshot = table.snapshot()
        game_state = table.game.snapshot()

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)

    add_admin_log(db, admin_user, "table.lock_betting", target_table_id=table_id)
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/unlock-betting", response_model=AdminTableDetail)
async def admin_unlock_betting(
    table_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        table.betting_locked = False
        table_snapshot = table.snapshot()
        game_state = table.game.snapshot()

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)

    add_admin_log(db, admin_user, "table.unlock_betting", target_table_id=table_id)
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.patch("/tables/{table_id}/rules", response_model=AdminTableDetail)
async def admin_update_table_rules(
    table_id: str,
    payload: AdminTableRulesUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        if table.game.is_round_active():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update rules during an active round",
            )
        if payload.min_bet is not None:
            table.config.min_bet = payload.min_bet
        if payload.max_bet is not None:
            table.config.max_bet = max(payload.max_bet, table.config.min_bet)
        if payload.decks is not None:
            table.config.decks = payload.decks
        if payload.starting_bank is not None:
            table.config.starting_bank = payload.starting_bank
        table.game = None
        state.ensure_game(table)
        table_snapshot = table.snapshot()
        game_state = table.game.snapshot() if table.game else None

    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)

    add_admin_log(
        db,
        admin_user,
        "table.update_rules",
        target_table_id=table_id,
        payload={
            "min_bet": payload.min_bet,
            "max_bet": payload.max_bet,
            "decks": payload.decks,
            "starting_bank": payload.starting_bank,
        },
    )
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/force-result", response_model=AdminTableDetail)
async def admin_force_result(
    table_id: str,
    payload: AdminForceResultRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    events = []
    round_id = None
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        game = table.game
        error = game.force_result(payload.result)
        if error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        events = game.consume_events()
        round_id = game.round_id
        table_snapshot = table.snapshot()
        game_state = game.snapshot()

    await log_game_events(table_id, round_id, events)
    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)

    add_admin_log(
        db,
        admin_user,
        "table.force_result",
        target_table_id=table_id,
        payload={"result": payload.result},
    )
    db.commit()
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/kick", response_model=AdminTableSummary)
async def admin_table_kick(
    table_id: str,
    payload: AdminTableKickRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableSummary:
    table_snapshot = None
    tables_payload = None
    player_sid = None
    token = None
    removed_table_id = table_id
    async with state_lock:
        table = state.tables.get(table_id)
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        player = table.players.get(payload.user_id)
        if not player:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
        player_sid = player.sid
        removed_table_id, table, removed = state.remove_from_table(player)
        table_snapshot = table.snapshot() if table and not removed else None
        tables_payload = state.list_tables()
        if removed_table_id and table and table.game:
            token = _set_turn_deadline(removed_table_id)
        summary = build_table_summary(table) if table else None

    if player_sid and removed_table_id:
        await sio.leave_room(player_sid, table_room(removed_table_id))
        await sio.emit("table:kicked", {"tableId": removed_table_id}, room=player_sid)
    if removed_table_id and table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(removed_table_id))
        await emit_game_state(removed_table_id)
    if tables_payload is not None:
        await sio.emit("lobby:snapshot", {"tables": tables_payload}, room=LOBBY_ROOM)
    if token and removed_table_id:
        asyncio.create_task(schedule_turn_timeout(removed_table_id, token))

    add_admin_log(
        db,
        admin_user,
        "table.kick",
        target_user_id=parse_uuid(payload.user_id),
        target_table_id=removed_table_id,
    )
    db.commit()

    if summary:
        return summary
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")


@router.post("/tables/{table_id}/force-stand", response_model=AdminTableDetail)
async def admin_force_stand(
    table_id: str,
    payload: AdminForceStandRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    events = []
    round_id = None
    token = None
    table_snapshot = None
    game_state = None
    target_user_id = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        game = table.game
        target_id = payload.user_id or game.active_player_id
        if not target_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active player")
        error = game.stand(target_id, auto=True)
        if error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        target_user_id = target_id
        events = game.consume_events()
        round_id = game.round_id
        token = _set_turn_deadline(table_id)
        table_snapshot = table.snapshot()
        game_state = game.snapshot()

    await log_game_events(table_id, round_id, events)
    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)
    if token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))

    add_admin_log(
        db,
        admin_user,
        "table.force_stand",
        target_user_id=parse_uuid(target_user_id),
        target_table_id=table_id,
        payload={"action": "force_stand"},
    )
    db.commit()

    if not table_snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.post("/tables/{table_id}/end-round", response_model=AdminTableDetail)
async def admin_end_round(
    table_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminTableDetail:
    events = []
    round_id = None
    token = None
    table_snapshot = None
    game_state = None
    async with state_lock:
        table = state.tables.get(table_id)
        if not table or not table.game:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        game = table.game
        error = game.force_end_round()
        if error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
        events = game.consume_events()
        round_id = game.round_id
        token = _set_turn_deadline(table_id)
        table_snapshot = table.snapshot()
        game_state = game.snapshot()

    await log_game_events(table_id, round_id, events)
    if table_snapshot:
        await sio.emit("table:state", table_snapshot, room=table_room(table_id))
    await emit_game_state(table_id)
    if token:
        asyncio.create_task(schedule_turn_timeout(table_id, token))

    add_admin_log(
        db,
        admin_user,
        "table.end_round",
        target_table_id=table_id,
    )
    db.commit()

    if not table_snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
    return build_table_detail_from_snapshot(table_snapshot, game_state)


@router.get("/crypto/deposits", response_model=list[AdminCryptoDeposit])
def admin_crypto_deposits(
    status: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminCryptoDeposit]:
    query = select(CryptoDeposit).order_by(CryptoDeposit.created_at.desc())
    if status:
        query = query.where(CryptoDeposit.status == status)
    deposits = db.scalars(query.limit(min(limit, 500))).all()
    return [AdminCryptoDeposit.model_validate(entry) for entry in deposits]


@router.get("/crypto/withdrawals", response_model=list[AdminCryptoWithdrawal])
def admin_crypto_withdrawals(
    status: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminCryptoWithdrawal]:
    query = select(CryptoWithdrawal).order_by(CryptoWithdrawal.created_at.desc())
    if status:
        query = query.where(CryptoWithdrawal.status == status)
    withdrawals = db.scalars(query.limit(min(limit, 500))).all()
    return [AdminCryptoWithdrawal.model_validate(entry) for entry in withdrawals]


@router.post("/crypto/withdrawals/{withdrawal_id}/approve", response_model=AdminCryptoWithdrawal)
def admin_approve_withdrawal(
    withdrawal_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminCryptoWithdrawal:
    withdrawal = db.get(CryptoWithdrawal, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    if withdrawal.status not in {"pending"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    withdrawal.status = "approved"
    add_admin_log(
        db,
        admin_user,
        "withdrawal.approve",
        target_user_id=withdrawal.user_id,
        payload={"withdrawal_id": str(withdrawal_id)},
    )
    db.commit()
    db.refresh(withdrawal)
    return AdminCryptoWithdrawal.model_validate(withdrawal)


@router.post("/crypto/withdrawals/{withdrawal_id}/reject", response_model=AdminCryptoWithdrawal)
def admin_reject_withdrawal(
    withdrawal_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminCryptoWithdrawal:
    withdrawal = db.get(CryptoWithdrawal, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    if withdrawal.status not in {"pending", "approved"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    wallet = db.get(Wallet, withdrawal.wallet_id)
    if wallet:
        wallet.balance += withdrawal.amount_tokens
        refund = WalletTransaction(
            wallet_id=wallet.id,
            amount=withdrawal.amount_tokens,
            kind="crypto_withdrawal_refund",
            status="completed",
        )
        db.add(refund)
    withdrawal.status = "rejected"

    if withdrawal.transaction_id:
        transaction = db.get(WalletTransaction, withdrawal.transaction_id)
        if transaction:
            transaction.status = "rejected"

    add_admin_log(
        db,
        admin_user,
        "withdrawal.reject",
        target_user_id=withdrawal.user_id,
        payload={"withdrawal_id": str(withdrawal_id)},
    )
    db.commit()
    db.refresh(withdrawal)
    return AdminCryptoWithdrawal.model_validate(withdrawal)


@router.post("/crypto/withdrawals/{withdrawal_id}/mark-paid", response_model=AdminCryptoWithdrawal)
def admin_mark_withdrawal_paid(
    withdrawal_id: uuid.UUID,
    payload: AdminWithdrawalActionRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> AdminCryptoWithdrawal:
    withdrawal = db.get(CryptoWithdrawal, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Withdrawal not found")
    if withdrawal.status not in {"approved", "pending"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    withdrawal.status = "paid"
    if payload.tx_hash:
        withdrawal.tx_hash = payload.tx_hash

    if withdrawal.transaction_id:
        transaction = db.get(WalletTransaction, withdrawal.transaction_id)
        if transaction:
            transaction.status = "completed"

    add_admin_log(
        db,
        admin_user,
        "withdrawal.mark_paid",
        target_user_id=withdrawal.user_id,
        payload={
            "withdrawal_id": str(withdrawal_id),
            "tx_hash": payload.tx_hash,
        },
    )
    db.commit()
    db.refresh(withdrawal)
    return AdminCryptoWithdrawal.model_validate(withdrawal)
