from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import uuid

from app.game.blackjack import BlackjackGame


MIN_TABLE_PLAYERS = 2
MAX_TABLE_PLAYERS = 8
CHAT_HISTORY_LIMIT = 150


@dataclass
class TableConfig:
    min_bet: int = 10
    max_bet: int = 500
    decks: int = 6
    starting_bank: int = 2500


@dataclass
class ChatMessage:
    message_id: str
    table_id: str
    user_id: str | None
    display_name: str
    message: str
    created_at: datetime
    system: bool = False

    def payload(self) -> dict:
        return {
            "id": self.message_id,
            "tableId": self.table_id,
            "userId": self.user_id,
            "displayName": self.display_name,
            "message": self.message,
            "createdAt": self.created_at.isoformat(),
            "system": self.system,
        }


class TableError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass
class PlayerState:
    user_id: str
    display_name: str
    sid: str
    is_ready: bool = False
    last_chat_at: datetime | None = None
    muted_until: datetime | None = None


@dataclass
class TableState:
    table_id: str
    name: str
    is_private: bool
    max_players: int
    invite_code: str | None = None
    config: TableConfig = field(default_factory=TableConfig)
    is_paused: bool = False
    betting_locked: bool = False
    players: dict[str, PlayerState] = field(default_factory=dict)
    game: BlackjackGame | None = None
    chat_log: list[ChatMessage] = field(default_factory=list)

    def summary(self) -> dict:
        return {
            "id": self.table_id,
            "name": self.name,
            "isPrivate": self.is_private,
            "maxPlayers": self.max_players,
            "playerCount": len(self.players),
        }

    def snapshot(self) -> dict:
        return {
            "id": self.table_id,
            "name": self.name,
            "isPrivate": self.is_private,
            "maxPlayers": self.max_players,
            "inviteCode": self.invite_code,
            "isPaused": self.is_paused,
            "bettingLocked": self.betting_locked,
            "minBet": self.config.min_bet,
            "maxBet": self.config.max_bet,
            "decks": self.config.decks,
            "startingBank": self.config.starting_bank,
            "players": [
                {
                    "userId": player.user_id,
                    "displayName": player.display_name,
                    "isReady": player.is_ready,
                }
                for player in self.players.values()
            ],
        }


class LobbyState:
    def __init__(self) -> None:
        self.tables: dict[str, TableState] = {}
        self.sid_to_player: dict[str, PlayerState] = {}
        self.user_to_table: dict[str, str] = {}
        self.invite_codes: dict[str, str] = {}

    def list_tables(self) -> list[dict]:
        return [table.summary() for table in self.tables.values() if not table.is_private]

    def resolve_invite_code(self, code: str) -> str | None:
        normalized = code.strip().upper()
        return self.invite_codes.get(normalized)

    def _register_invite_code(self, table_id: str) -> str:
        while True:
            code = uuid.uuid4().hex[:6].upper()
            if code not in self.invite_codes:
                self.invite_codes[code] = table_id
                return code

    def _remove_invite_code(self, table: TableState) -> None:
        if table.invite_code:
            self.invite_codes.pop(table.invite_code, None)

    def ensure_game(self, table: TableState) -> BlackjackGame:
        if not table.game:
            table.game = BlackjackGame(
                table_id=table.table_id,
                min_bet=table.config.min_bet,
                max_bet=table.config.max_bet,
                decks=table.config.decks,
                default_bank=table.config.starting_bank,
            )
        table.game.sync_players(
            [(player.user_id, player.display_name) for player in table.players.values()]
        )
        return table.game

    def register_player(
        self,
        sid: str,
        user_id: str,
        display_name: str,
        muted_until: datetime | None = None,
    ) -> PlayerState:
        player = PlayerState(
            user_id=user_id,
            display_name=display_name,
            sid=sid,
            muted_until=muted_until,
        )
        self.sid_to_player[sid] = player
        return player

    def get_player(self, sid: str) -> PlayerState | None:
        return self.sid_to_player.get(sid)

    def get_user_table(self, user_id: str) -> str | None:
        return self.user_to_table.get(user_id)

    def unregister_player(
        self, sid: str
    ) -> tuple[str | None, TableState | None, bool]:
        player = self.sid_to_player.pop(sid, None)
        if not player:
            return None, None, False
        return self.remove_from_table(player)

    def remove_from_table(
        self, player: PlayerState
    ) -> tuple[str | None, TableState | None, bool]:
        table_id = self.user_to_table.pop(player.user_id, None)
        if not table_id:
            return None, None, False
        table = self.tables.get(table_id)
        if not table:
            return table_id, None, False
        table.players.pop(player.user_id, None)
        if table.game:
            table.game.sync_players(
                [(seat.user_id, seat.display_name) for seat in table.players.values()]
            )
        removed = False
        if not table.players:
            self._remove_invite_code(table)
            self.tables.pop(table_id, None)
            removed = True
        return table_id, table, removed

    def create_table(
        self,
        player: PlayerState,
        name: str,
        is_private: bool,
        max_players: int,
        config: TableConfig | None = None,
    ) -> TableState:
        normalized_max = min(max(max_players, MIN_TABLE_PLAYERS), MAX_TABLE_PLAYERS)
        table_id = uuid.uuid4().hex[:8]
        invite_code = self._register_invite_code(table_id) if is_private else None
        table = TableState(
            table_id=table_id,
            name=name or "Table",
            is_private=is_private,
            max_players=normalized_max,
            invite_code=invite_code,
            config=config or TableConfig(),
        )
        table.players[player.user_id] = player
        player.is_ready = False
        self.tables[table_id] = table
        self.user_to_table[player.user_id] = table_id
        return table

    def get_chat_history(self, table_id: str) -> list[dict]:
        table = self.tables.get(table_id)
        if not table:
            return []
        return [message.payload() for message in table.chat_log]

    def add_chat_message(self, table_id: str, message: ChatMessage) -> dict | None:
        table = self.tables.get(table_id)
        if not table:
            return None
        table.chat_log.append(message)
        if len(table.chat_log) > CHAT_HISTORY_LIMIT:
            table.chat_log = table.chat_log[-CHAT_HISTORY_LIMIT:]
        return message.payload()

    def join_table(self, player: PlayerState, table_id: str) -> TableState:
        table = self.tables.get(table_id)
        if not table:
            raise TableError("not_found", "Table not found")
        if table.game and table.game.is_round_active():
            raise TableError("in_progress", "Round already started")
        if len(table.players) >= table.max_players:
            raise TableError("table_full", "Table is full")
        table.players[player.user_id] = player
        player.is_ready = False
        self.user_to_table[player.user_id] = table_id
        if table.game:
            table.game.sync_players(
                [(seat.user_id, seat.display_name) for seat in table.players.values()]
            )
        return table

    def move_to_table(
        self, player: PlayerState, table_id: str
    ) -> tuple[TableState, str | None, TableState | None, bool]:
        current_table_id = self.user_to_table.get(player.user_id)
        if current_table_id == table_id:
            table = self.tables.get(table_id)
            if not table:
                raise TableError("not_found", "Table not found")
            return table, None, None, False

        table = self.join_table(player, table_id)
        prev_table_id = current_table_id
        prev_table = None
        prev_removed = False
        if prev_table_id:
            prev_table = self.tables.get(prev_table_id)
            if prev_table:
                prev_table.players.pop(player.user_id, None)
                if not prev_table.players:
                    self._remove_invite_code(prev_table)
                    self.tables.pop(prev_table_id, None)
                    prev_removed = True
                elif prev_table.game:
                    prev_table.game.sync_players(
                        [(seat.user_id, seat.display_name) for seat in prev_table.players.values()]
                    )
        return table, prev_table_id, prev_table, prev_removed

    def set_ready(self, player: PlayerState, is_ready: bool) -> TableState | None:
        table_id = self.user_to_table.get(player.user_id)
        if not table_id:
            return None
        table = self.tables.get(table_id)
        if not table:
            return None
        table.players[player.user_id].is_ready = is_ready
        return table
