from __future__ import annotations

from decimal import Decimal, ROUND_DOWN

from app.core.config import settings


def tokens_from_base(chain: str, amount_base: int) -> int:
    decimals = 18 if chain == "ETH" else 9
    rate = Decimal(str(settings.eth_usd_rate if chain == "ETH" else settings.sol_usd_rate))
    token_amount = (Decimal(amount_base) / Decimal(10**decimals)) * rate
    return int(token_amount.quantize(Decimal("1"), rounding=ROUND_DOWN))
