from __future__ import annotations

try:
    from bip_utils import Bip39SeedGenerator, Bip44, Bip44Changes, Bip44Coins
    _BIP_UTILS_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    _BIP_UTILS_AVAILABLE = False


def bip_utils_available() -> bool:
    return _BIP_UTILS_AVAILABLE


def _require_bip_utils() -> None:
    if not _BIP_UTILS_AVAILABLE:
        raise RuntimeError("bip-utils not installed")


def derive_eth_address(xpub: str, index: int) -> str:
    _require_bip_utils()
    ctx = Bip44.FromExtendedKey(xpub, Bip44Coins.ETHEREUM)
    return ctx.Change(Bip44Changes.CHAIN_EXT).AddressIndex(index).PublicKey().ToAddress()


def derive_sol_address(mnemonic: str, index: int) -> str:
    _require_bip_utils()
    seed_bytes = Bip39SeedGenerator(mnemonic).Generate()
    ctx = Bip44.FromSeed(seed_bytes, Bip44Coins.SOLANA)
    return ctx.Change(Bip44Changes.CHAIN_EXT).AddressIndex(index).PublicKey().ToAddress()
