from __future__ import annotations

from bip_utils import Bip39SeedGenerator, Bip44, Bip44Changes, Bip44Coins


def derive_eth_address(xpub: str, index: int) -> str:
    ctx = Bip44.FromExtendedKey(xpub, Bip44Coins.ETHEREUM)
    return ctx.Change(Bip44Changes.CHAIN_EXT).AddressIndex(index).PublicKey().ToAddress()


def derive_sol_address(mnemonic: str, index: int) -> str:
    seed_bytes = Bip39SeedGenerator(mnemonic).Generate()
    ctx = Bip44.FromSeed(seed_bytes, Bip44Coins.SOLANA)
    return ctx.Change(Bip44Changes.CHAIN_EXT).AddressIndex(index).PublicKey().ToAddress()
