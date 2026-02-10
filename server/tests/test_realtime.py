import unittest
from datetime import datetime
from app.realtime.state import LobbyState, PlayerState, TableConfig

# Mock Player
def create_player(user_id, name):
    return PlayerState(user_id=user_id, display_name=name, sid=f"sid_{user_id}")

class TestRealtimeState(unittest.TestCase):
    def setUp(self):
        self.lobby = LobbyState()
        self.player1 = self.lobby.register_player("sid_1", "user1", "Alice")
        self.player2 = self.lobby.register_player("sid_2", "user2", "Bob")

    def test_create_and_join_table(self):
        """Test creating a table and another player joining it."""
        # Create Table
        table = self.lobby.create_table(
            self.player1, "Alice's Table", is_private=False, max_players=4
        )
        self.assertIn("user1", table.players)
        self.assertEqual(table.name, "Alice's Table")
        
        # Ensure game is initialized (lazy loading usually, but ensure_game does it)
        game = self.lobby.ensure_game(table)
        self.assertIsNotNone(game)
        self.assertEqual(game.table_id, table.table_id)
        
        # Join Table
        joined_table = self.lobby.join_table(self.player2, table.table_id)
        self.assertEqual(joined_table.table_id, table.table_id)
        self.assertIn("user2", table.players)
        
        # Verify sync_players was called on game
        self.assertIn("user2", game.players)

    def test_game_lifecycle_via_state(self):
        """Test starting a round via the state manager."""
        table = self.lobby.create_table(
            self.player1, "Game Table", is_private=False, max_players=2
        )
        self.lobby.join_table(self.player2, table.table_id)
        
        # Both players ready (state logic doesn't strictly enforce ready check in ensure_game, 
        # but server.py does. Here we test state/engine interaction).
        game = self.lobby.ensure_game(table)
        
        # Start Round - requires valid banks (default is 2500)
        error = game.start_round()
        self.assertIsNone(error)
        self.assertTrue(game.is_round_active())
        
        # Check initial Deal
        self.assertEqual(len(game.players["user1"].hands[0].cards), 2)
        self.assertEqual(len(game.players["user2"].hands[0].cards), 2)

    def test_remove_player_cleanup(self):
        """Test that removing a player cleans up the table/game if empty."""
        table = self.lobby.create_table(self.player1, "Cleanup Table", False, 2)
        table_id = table.table_id
        
        # Remove player
        tid, _, removed = self.lobby.unregister_player("sid_1")
        self.assertEqual(tid, table_id)
        self.assertTrue(removed)
        self.assertNotIn(table_id, self.lobby.tables)

if __name__ == '__main__':
    unittest.main()
