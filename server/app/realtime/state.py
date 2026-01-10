from __future__ import annotations

from dataclasses import dataclass, field
import uuid


MIN_TABLE_PLAYERS = 2
MAX_TABLE_PLAYERS = 8


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


@dataclass
class TableState:
    table_id: str
    name: str
    is_private: bool
    max_players: int
    players: dict[str, PlayerState] = field(default_factory=dict)

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

    def list_tables(self) -> list[dict]:
        return [table.summary() for table in self.tables.values()]

    def register_player(self, sid: str, user_id: str, display_name: str) -> PlayerState:
        player = PlayerState(user_id=user_id, display_name=display_name, sid=sid)
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
        removed = False
        if not table.players:
            self.tables.pop(table_id, None)
            removed = True
        return table_id, table, removed

    def create_table(
        self,
        player: PlayerState,
        name: str,
        is_private: bool,
        max_players: int,
    ) -> TableState:
        normalized_max = min(max(max_players, MIN_TABLE_PLAYERS), MAX_TABLE_PLAYERS)
        table_id = uuid.uuid4().hex[:8]
        table = TableState(
            table_id=table_id,
            name=name or "Table",
            is_private=is_private,
            max_players=normalized_max,
        )
        table.players[player.user_id] = player
        player.is_ready = False
        self.tables[table_id] = table
        self.user_to_table[player.user_id] = table_id
        return table

    def join_table(self, player: PlayerState, table_id: str) -> TableState:
        table = self.tables.get(table_id)
        if not table:
            raise TableError("not_found", "Table not found")
        if len(table.players) >= table.max_players:
            raise TableError("table_full", "Table is full")
        table.players[player.user_id] = player
        player.is_ready = False
        self.user_to_table[player.user_id] = table_id
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
                    self.tables.pop(prev_table_id, None)
                    prev_removed = True
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
