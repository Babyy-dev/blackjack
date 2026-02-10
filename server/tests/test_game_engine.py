import unittest
from app.game.constants import RANKS, SUITS
from app.game.card import Card, build_shoe
from app.game.hand import calculate_total, is_soft_total
from app.game.engine import BlackjackGame

class TestBlackjackEngine(unittest.TestCase):
    def test_deck_integrity(self):
        """Test that a single deck has 52 unique cards."""
        shoe = build_shoe(1)
        self.assertEqual(len(shoe), 52)
        unique_cards = {(c.rank, c.suit) for c in shoe}
        self.assertEqual(len(unique_cards), 52)

    def test_calculate_total(self):
        """Test score calculation including Aces."""
        # A + 9 = 20
        cards = [Card("A", "spades", 0), Card("9", "hearts", 1)]
        self.assertEqual(calculate_total(cards), 20)
        
        # A + 9 + 5 = 15 (Ace becomes 1)
        cards.append(Card("5", "diamonds", 2))
        self.assertEqual(calculate_total(cards), 15)
        
        # A + A = 12 (11 + 1)
        cards = [Card("A", "spades", 0), Card("A", "hearts", 1)]
        self.assertEqual(calculate_total(cards), 12)
        
        # BlackJack (A + K) = 21
        cards = [Card("A", "spades", 0), Card("K", "hearts", 1)]
        self.assertEqual(calculate_total(cards), 21)

    def test_game_flow(self):
        """Test a full round of blackjack."""
        game = BlackjackGame("table1", min_bet=10, default_bank=100)
        
        # Add player
        game.sync_players([("user1", "Alice")])
        self.assertIn("user1", game.players)
        self.assertEqual(game.players["user1"].bank, 100)
        
        # Start Round
        game.start_round()
        self.assertEqual(game.status, "player")
        self.assertEqual(game.active_player_id, "user1")
        
        # User is dealt 2 cards
        user_hand = game.players["user1"].hands[0]
        self.assertEqual(len(user_hand.cards), 2)
        
        # Dealer dealt 1 card (technically 2 but hole card logic might vary, 
        # but engine adds 2 cards, one hidden effectively by not showing it? 
        # Logic says: dealer gets 1 card in loop + 1 card after.
        # Let's check dealer hand size.
        self.assertEqual(len(game.dealer.hands[0].cards), 2)
        
        # Player Hit
        initial_count = len(user_hand.cards)
        game.hit("user1")
        # Might bust or not, but card count should increase if not busted immediately?
        # If bust, turn advances. If not, stays.
        if user_hand.status == "playing":
             self.assertEqual(len(user_hand.cards), initial_count + 1)
             
        # Force Stand if still playing
        if game.status == "player":
            game.stand("user1")
            
        # Should be dealer turn or settled
        self.assertTrue(game.status in ["dealer", "settle", "round_end"])
        
        # If dealer turn finished, it settles immediately
        if game.status == "round_end":
            self.assertIsNotNone(game.players["user1"].hands[0].result)
            
    def test_payouts(self):
        """Test simple payout logic by forcing results."""
        game = BlackjackGame("table1", min_bet=10, default_bank=100)
        game.sync_players([("user1", "Alice")])
        game.start_round()
        
        # Mock hands for deterministic result
        player_hand = game.players["user1"].hands[0]
        # Force player 20
        player_hand.cards = [Card("K", "spades", 0), Card("Q", "hearts", 1)] 
        
        # Force dealer 19
        dealer_hand = game.dealer.hands[0]
        dealer_hand.cards = [Card("9", "spades", 2), Card("Q", "diamonds", 3)]
        
        # Force resolve
        game.force_end_round() # Dealer should stand on 19
        
        # Player (20) > Dealer (19) => Win
        self.assertEqual(player_hand.result, "win")
        # Bank should include bet + winning: 90 (remaining) + 20 (payout) = 110
        self.assertEqual(game.players["user1"].bank, 110)

if __name__ == '__main__':
    unittest.main()
