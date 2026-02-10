from __future__ import annotations
from datetime import datetime, timezone
import secrets
import uuid
from typing import Optional, Dict, List, Set, Tuple

from app.game.constants import RANKS, SUITS
from app.game.card import Card, build_shoe
from app.game.hand import HandState, SeatState, calculate_total, is_soft_total

class BlackjackGame:
    def __init__(
        self,
        table_id: str,
        min_bet: int = 10,
        max_bet: int = 500,
        decks: int = 6,
        default_bank: int = 2500,
        dealer_hits_soft_17: bool = False,
    ) -> None:
        self.table_id = table_id
        self.min_bet = min_bet
        self.max_bet = max_bet
        self.decks = decks
        self.default_bank = default_bank
        self.dealer_hits_soft_17 = dealer_hits_soft_17
        self.random = secrets.SystemRandom()

        self.shoe: list[Card] = []
        self.cards_played = 0
        self.shoe_serial = 0
        self.pending_shuffle = False
        self.pending_shuffle_remaining: int | None = None
        self.players: dict[str, SeatState] = {}
        self.seat_order: list[str] = []
        self.dealer = SeatState(user_id="dealer", display_name="Dealer", bank=0)

        self.status: str = "waiting"
        self.show_dealer_hole_card = False
        self.active_player_id: str | None = None
        self.active_hand_id: str | None = None
        self.round_id: str | None = None
        self.turn_token = 0
        self.turn_ends_at: datetime | None = None
        self.events: list[dict] = []

        self._reset_shoe()

    def _reset_shoe(self) -> None:
        self.shoe = build_shoe(self.decks)
        total = self.decks * 52
        offset = self.shoe_serial * total
        if offset:
            for card in self.shoe:
                card.index += offset
        self.shoe_serial += 1
        self.random.shuffle(self.shoe)
        self.cards_played = 0

    def _apply_pending_shuffle(self) -> None:
        if not self.pending_shuffle:
            return
        remaining = self.pending_shuffle_remaining
        self._reset_shoe()
        self._log_event("shuffle", None, {"remaining": remaining or 0})
        self.pending_shuffle = False
        self.pending_shuffle_remaining = None

    def _maybe_reshuffle(self) -> None:
        remaining = len(self.shoe)
        total = self.decks * 52
        if remaining / total <= 0.25:
            if self.is_round_active():
                self.pending_shuffle = True
                self.pending_shuffle_remaining = remaining
                return
            self._reset_shoe()
            self._log_event("shuffle", None, {"remaining": remaining})

    def _draw_card(self) -> Card:
        self._maybe_reshuffle()
        if not self.shoe:
            self._reset_shoe()
            self._log_event("shuffle", None, {"remaining": 0, "forced": True})
        card = self.shoe.pop()
        self.cards_played += 1
        return card

    def _log_event(self, action: str, user_id: str | None, payload: dict | None = None) -> None:
        self.events.append(
            {
                "table_id": self.table_id,
                "round_id": self.round_id,
                "user_id": user_id,
                "action": action,
                "payload": payload or {},
                "created_at": datetime.now(timezone.utc),
            }
        )

    def consume_events(self) -> list[dict]:
        events = self.events
        self.events = []
        return events

    def sync_players(self, players: list[tuple[str, str]]) -> None:
        existing = set(self.players.keys())
        incoming = {user_id for user_id, _ in players}

        for user_id, display_name in players:
            if user_id in self.players:
                self.players[user_id].display_name = display_name
                continue
            self.players[user_id] = SeatState(
                user_id=user_id,
                display_name=display_name,
                bank=self.default_bank,
                hands=[],
            )
            self.seat_order.append(user_id)



        for user_id in list(existing - incoming):
            self.players.pop(user_id, None)
            if user_id in self.seat_order:
                self.seat_order.remove(user_id)
            if self.active_player_id == user_id:
                self.active_player_id = None
                self.active_hand_id = None

        if self.active_player_id and self.active_player_id not in self.players:
            self.active_player_id = None
            self.active_hand_id = None

        if self.is_round_active() and not self.active_player_id:
            if not self._set_next_active_player():
                self._dealer_turn()

    def is_round_active(self) -> bool:
        return self.status in {"dealing", "player", "dealer", "settle"}

    def start_round(self) -> str | None:
        if self.is_round_active():
            return "Round already in progress."
        if not self.players:
            return "No players available."

        self._apply_pending_shuffle()
        self._maybe_reshuffle()

        self.round_id = uuid.uuid4().hex
        self.status = "dealing"
        self.show_dealer_hole_card = False
        self.turn_token += 1
        self.turn_ends_at = None

        for seat in self.players.values():
            seat.hands = []
            seat.active_hand_index = 0
            if seat.bank < self.min_bet:
                seat.hands.append(HandState(status="waiting", bet=0))
                continue
            bet = min(self.min_bet, seat.bank, self.max_bet)
            seat.bank -= bet
            seat.hands.append(HandState(status="playing", bet=bet))

        self.dealer.hands = [HandState(status="playing", bet=0)]

        if all(hand.bet == 0 for seat in self.players.values() for hand in seat.hands):
            self.status = "waiting"
            return "Players do not have enough balance."

        self._log_event("round_start", None, {"min_bet": self.min_bet})
        self._deal_initial_cards()
        self._mark_natural_blackjacks()

        if self._dealer_has_blackjack():
            self.show_dealer_hole_card = True
            self._settle_round()
            return None

        if not self._set_next_active_player():
            self._dealer_turn()
        return None

    def force_end_round(self) -> str | None:
        if not self.is_round_active():
            return "No round in progress."
        self.show_dealer_hole_card = True
        self._dealer_turn()
        return None

    def force_result(self, result: str) -> str | None:
        if not self.is_round_active():
            return "No round in progress."
        self.show_dealer_hole_card = True
        summary: Dict[str, Dict[str, int]] = {}

        for user_id, seat in self.players.items():
            for hand in seat.hands:
                if hand.bet == 0:
                    continue
                if result in {"dealer_win", "dealer_blackjack"}:
                    hand.result = "lose"
                elif result in {"player_win", "dealer_bust"}:
                    hand.result = "win"
                else:
                    hand.result = "push"
                hand.status = "stand"

                payout = 0
                if hand.result == "win":
                    payout = hand.bet * 2
                elif hand.result == "push":
                    payout = hand.bet

                seat.bank += payout
                summary.setdefault(user_id, {"delta": 0})
                summary[user_id]["delta"] += payout - hand.bet

        self._log_event("force_result", None, {"result": result, "summary": summary})
        self.status = "round_end"
        self.active_player_id = None
        self.active_hand_id = None
        self.turn_token += 1
        self.turn_ends_at = None
        return None

    def credit_bank(self, user_id: str, amount: int) -> str | None:
        if amount <= 0:
            return "Invalid amount."
        seat = self.players.get(user_id)
        if not seat:
            return "Seat not found."
        seat.bank += amount
        self._log_event("wallet_deposit", user_id, {"amount": amount})
        return None

    def _deal_initial_cards(self) -> None:
        for _ in range(2):
            for user_id in self.seat_order:
                seat = self.players.get(user_id)
                if not seat:
                    continue
                if not seat.hands or seat.hands[0].bet == 0:
                    continue
                card = self._draw_card()
                seat.hands[0].cards.append(card)
                self._log_event("deal", user_id, {"hand_id": seat.hands[0].hand_id})
            dealer_card = self._draw_card()
            self.dealer.hands[0].cards.append(dealer_card)
            self._log_event("deal", "dealer", {"hand_id": self.dealer.hands[0].hand_id})

    def _dealer_has_blackjack(self) -> bool:
        hand = self.dealer.hands[0]
        return len(hand.cards) == 2 and calculate_total(hand.cards) == 21

    def _mark_natural_blackjacks(self) -> None:
        for user_id, seat in self.players.items():
            for hand in seat.hands:
                if hand.bet == 0 or len(hand.cards) != 2:
                    continue
                if calculate_total(hand.cards) == 21:
                    hand.status = "blackjack"
                    hand.result = "blackjack"
                    self._log_event("blackjack", user_id, {"hand_id": hand.hand_id})

    def _seat_has_playing_hand(self, seat: SeatState) -> bool:
        return any(hand.status == "playing" for hand in seat.hands)

    def _set_next_active_player(self) -> bool:
        for user_id in self.seat_order:
            seat = self.players.get(user_id)
            if not seat:
                continue
            if not self._seat_has_playing_hand(seat):
                continue
            for index, hand in enumerate(seat.hands):
                if hand.status == "playing":
                    seat.active_hand_index = index
                    self.active_player_id = user_id
                    self.active_hand_id = hand.hand_id
                    self.status = "player"
                    self.turn_token += 1
                    return True
        self.active_player_id = None
        self.active_hand_id = None
        return False

    def _advance_turn(self) -> None:
        if self.active_player_id is None:
            return
        seat = self.players.get(self.active_player_id)
        if not seat:
            if not self._set_next_active_player():
                self._dealer_turn()
            return

        for idx in range(seat.active_hand_index + 1, len(seat.hands)):
            if seat.hands[idx].status == "playing":
                seat.active_hand_index = idx
                self.active_hand_id = seat.hands[idx].hand_id
                self.turn_token += 1
                return

        self.active_player_id = None
        self.active_hand_id = None

        for user_id in self.seat_order:
            seat = self.players.get(user_id)
            if not seat:
                continue
            if not self._seat_has_playing_hand(seat):
                continue
            seat.active_hand_index = 0
            for idx, hand in enumerate(seat.hands):
                if hand.status == "playing":
                    seat.active_hand_index = idx
                    self.active_player_id = user_id
                    self.active_hand_id = hand.hand_id
                    self.turn_token += 1
                    return

        self._dealer_turn()

    def _current_hand(self) -> HandState | None:
        if not self.active_player_id:
            return None
        seat = self.players.get(self.active_player_id)
        if not seat or not seat.hands:
            return None
        if seat.active_hand_index >= len(seat.hands):
            return None
        return seat.hands[seat.active_hand_index]

    def hit(self, user_id: str) -> str | None:
        if self.status != "player":
            return "Round is not accepting actions."
        if user_id != self.active_player_id:
            return "Not your turn."
        hand = self._current_hand()
        if not hand or hand.status != "playing":
            return "Hand is not active."

        card = self._draw_card()
        hand.cards.append(card)
        self._log_event("hit", user_id, {"hand_id": hand.hand_id})

        total = calculate_total(hand.cards)
        if total > 21:
            hand.status = "bust"
            hand.result = "bust"
            self._log_event("bust", user_id, {"hand_id": hand.hand_id})
            self._advance_turn()
        elif total == 21:
            hand.status = "stand"
            self._advance_turn()
        return None

    def stand(self, user_id: str, auto: bool = False) -> str | None:
        if self.status != "player":
            return "Round is not accepting actions."
        if user_id != self.active_player_id:
            return "Not your turn."
        hand = self._current_hand()
        if not hand or hand.status != "playing":
            return "Hand is not active."
        hand.status = "stand"
        self._log_event("auto_stand" if auto else "stand", user_id, {"hand_id": hand.hand_id})
        self._advance_turn()
        return None

    def double_down(self, user_id: str) -> str | None:
        if self.status != "player":
            return "Round is not accepting actions."
        if user_id != self.active_player_id:
            return "Not your turn."
        seat = self.players.get(user_id)
        hand = self._current_hand()
        if not seat:
            return "Seat not found."
        if not hand:
            return "Hand is not active."
        if hand.status != "playing":
            return "Hand is not active."
        if len(hand.cards) != 2 or seat.bank < hand.bet or len(seat.hands) > 1:
            return "Cannot double down."
        if hand.bet * 2 > self.max_bet:
            return "Cannot double down."

        seat.bank -= hand.bet
        hand.bet *= 2
        hand.is_doubled = True
        self._log_event("double", user_id, {"hand_id": hand.hand_id})

        card = self._draw_card()
        hand.cards.append(card)
        total = calculate_total(hand.cards)
        if total > 21:
            hand.status = "bust"
            hand.result = "bust"
        else:
            hand.status = "stand"
        self._advance_turn()
        return None

    def split(self, user_id: str) -> str | None:
        if self.status != "player":
            return "Round is not accepting actions."
        if user_id != self.active_player_id:
            return "Not your turn."
        seat = self.players.get(user_id)
        hand = self._current_hand()
        if not seat:
            return "Seat not found."
        if not hand:
            return "Hand is not active."
        if len(seat.hands) > 1 or len(hand.cards) != 2:
            return "Cannot split."
        if hand.cards[0].rank != hand.cards[1].rank:
            # Special logic for 10, J, Q, K equality could be added if desired,
            # but usually it's strict rank match.
            # However, most casinos allow splitting any 10-value cards (e.g. J and K).
            # The original code only checked rank equality. Let's stick to strict rank.
            return "Cannot split."
        if seat.bank < hand.bet:
            return "Not enough balance to split."

        seat.bank -= hand.bet
        left_card = hand.cards[0]
        right_card = hand.cards[1]
        hand.cards = [left_card]
        hand.is_split = True
        split_hand = HandState(
            bet=hand.bet,
            status="playing",
            cards=[right_card],
            is_split=True,
        )
        seat.hands.append(split_hand)
        seat.active_hand_index = 0
        self._log_event("split", user_id, {"hand_id": hand.hand_id, "split_id": split_hand.hand_id})

        self.active_hand_id = hand.hand_id
        return None

    def _dealer_turn(self) -> None:
        self.status = "dealer"
        self.show_dealer_hole_card = True
        hand = self.dealer.hands[0]
        while True:
            total = calculate_total(hand.cards)
            soft = is_soft_total(hand.cards)
            if total < 17 or (self.dealer_hits_soft_17 and total == 17 and soft):
                card = self._draw_card()
                hand.cards.append(card)
                self._log_event("dealer_hit", "dealer", {"hand_id": hand.hand_id})
                continue
            break
        self._settle_round()

    def _settle_round(self) -> None:
        self.status = "settle"
        dealer_hand = self.dealer.hands[0]
        dealer_total = calculate_total(dealer_hand.cards)
        dealer_bust = dealer_total > 21
        dealer_blackjack = dealer_total == 21 and len(dealer_hand.cards) == 2

        summary: Dict[str, Dict[str, int]] = {}

        for user_id, seat in self.players.items():
            for hand in seat.hands:
                if hand.bet == 0:
                    continue
                if hand.result == "bust":
                    continue
                total = calculate_total(hand.cards)
                if hand.result == "blackjack" and dealer_blackjack:
                    hand.result = "push"
                elif total == 21 and len(hand.cards) == 2 and not dealer_blackjack:
                    hand.result = "blackjack"
                elif dealer_blackjack and total != 21:
                    hand.result = "lose"
                elif dealer_bust and total <= 21:
                    hand.result = "win"
                elif total > 21:
                    hand.result = "bust"
                elif total > dealer_total:
                    hand.result = "win"
                elif total == dealer_total:
                    hand.result = "push"
                else:
                    hand.result = "lose"

                payout = 0
                if hand.result == "blackjack":
                    payout = int(hand.bet * 2.5) # 3:2 payout (1.5 + 1 = 2.5)
                elif hand.result == "win":
                    payout = hand.bet * 2
                elif hand.result == "push":
                    payout = hand.bet

                seat.bank += payout
                summary.setdefault(user_id, {"delta": 0})
                summary[user_id]["delta"] += payout - hand.bet

        self._log_event("round_end", None, {"summary": summary})
        self.status = "round_end"
        self.active_player_id = None
        self.active_hand_id = None
        self.turn_token += 1
        self.turn_ends_at = None

    def snapshot(self) -> dict:
        def normalize_card(card: Card) -> dict:
            rank = str(card.rank).upper()
            if rank not in RANKS:
                rank = "A"
            suit = str(card.suit).lower()
            if suit not in SUITS:
                suit = "spades"
            return {"rank": rank, "suit": suit, "index": card.index}

        players_payload: list[dict] = []
        players_payload.append(
            {
                "userId": self.dealer.user_id,
                "displayName": self.dealer.display_name,
                "isDealer": True,
                "bank": 0,
                "hands": [
                    {
                        "id": hand.hand_id,
                        "cards": [normalize_card(card) for card in hand.cards],
                        "bet": 0,
                        "result": hand.result,
                        "status": hand.status,
                    }
                    for hand in self.dealer.hands
                ],
            }
        )

        for user_id in self.seat_order:
            seat = self.players.get(user_id)
            if not seat:
                continue
            players_payload.append(
                {
                    "userId": seat.user_id,
                    "displayName": seat.display_name,
                    "isDealer": False,
                    "bank": seat.bank,
                    "hands": [
                        {
                            "id": hand.hand_id,
                            "cards": [normalize_card(card) for card in hand.cards],
                            "bet": hand.bet,
                            "result": hand.result,
                            "status": hand.status,
                        }
                        for hand in seat.hands
                    ],
                }
            )

        return {
            "tableId": self.table_id,
            "status": self.status,
            "roundId": self.round_id,
            "minBet": self.min_bet,
            "maxBet": self.max_bet,
            "cardsPlayed": self.cards_played,
            "shoeCount": len(self.shoe),
            "showDealerHoleCard": self.show_dealer_hole_card,
            "activePlayerId": self.active_player_id,
            "activeHandId": self.active_hand_id,
            "turnToken": self.turn_token,
            "turnEndsAt": self.turn_ends_at.isoformat() if self.turn_ends_at else None,
            "serverTime": datetime.now(timezone.utc).isoformat(),
            "players": players_payload,
        }
