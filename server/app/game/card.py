from dataclasses import dataclass
import secrets
from app.game.constants import RANKS, SUITS

@dataclass
class Card:
    rank: str
    suit: str
    index: int

def build_shoe(decks: int) -> list[Card]:
    cards: list[Card] = []
    index = 0
    for _ in range(decks):
        for suit in SUITS:
            for rank in RANKS:
                cards.append(Card(rank=rank, suit=suit, index=index))
                index += 1
    # Use cryptographic randomness for the initial shuffle as well
    # though usage in game usually shuffles the list in-place.
    # We return the ordered list here as requested by original logic,
    # but the game engine should shuffle it.
    return cards
