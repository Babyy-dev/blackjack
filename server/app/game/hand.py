from dataclasses import dataclass, field
import uuid
from app.game.constants import HandStatus, HandResult, CARD_VALUES
from app.game.card import Card

@dataclass
class HandState:
    hand_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    cards: list[Card] = field(default_factory=list)
    bet: int = 0
    status: HandStatus = "waiting"
    result: HandResult | None = None
    is_split: bool = False
    is_doubled: bool = False

@dataclass
class SeatState:
    user_id: str
    display_name: str
    bank: int
    hands: list[HandState] = field(default_factory=list)
    active_hand_index: int = 0

def calculate_total(cards: list[Card]) -> int:
    total = sum(CARD_VALUES[card.rank] for card in cards)
    aces = sum(1 for card in cards if card.rank == "A")
    while total > 21 and aces:
        total -= 10
        aces -= 1
    return total

def is_soft_total(cards: list[Card]) -> bool:
    total = sum(CARD_VALUES[card.rank] for card in cards)
    return any(card.rank == "A" for card in cards) and total <= 21
