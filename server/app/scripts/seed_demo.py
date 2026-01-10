from __future__ import annotations

from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import Profile, User, Wallet, WalletTransaction
from app.db.session import SessionLocal


DEMO_ADMIN_EMAIL = "admin@vlackjack.test"
DEMO_ADMIN_PASSWORD = "DemoAdmin123!"
DEMO_PLAYER_EMAIL = "player@vlackjack.test"
DEMO_PLAYER_PASSWORD = "DemoPlayer123!"


def ensure_user(
    email: str,
    password: str,
    display_name: str,
    is_admin: bool,
    initial_balance: int,
) -> bool:
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            if not existing.wallet:
                existing.wallet = Wallet(balance=initial_balance, currency="TOKEN")
                db.commit()
            return False

        user = User(
            email=email,
            password_hash=hash_password(password),
            is_active=True,
            is_admin=is_admin,
        )
        user.profile = Profile(display_name=display_name, bio="Demo account.")
        user.wallet = Wallet(balance=initial_balance, currency="TOKEN")
        db.add(user)
        db.commit()
        return True
    finally:
        db.close()


def seed_wallet_transactions(email: str, amounts: list[int]) -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        wallet = user.wallet if user and user.wallet else None
        if not wallet:
            return
        for amount in amounts:
            db.add(
                WalletTransaction(
                    wallet_id=wallet.id,
                    amount=amount,
                    kind="deposit" if amount > 0 else "adjustment",
                    status="completed",
                )
            )
        db.commit()
    finally:
        db.close()


def main() -> None:
    admin_created = ensure_user(
        email=DEMO_ADMIN_EMAIL,
        password=DEMO_ADMIN_PASSWORD,
        display_name="Pit Boss",
        is_admin=True,
        initial_balance=25000,
    )
    player_created = ensure_user(
        email=DEMO_PLAYER_EMAIL,
        password=DEMO_PLAYER_PASSWORD,
        display_name="High Roller",
        is_admin=False,
        initial_balance=5000,
    )

    if admin_created:
        seed_wallet_transactions(DEMO_ADMIN_EMAIL, [25000])
    if player_created:
        seed_wallet_transactions(DEMO_PLAYER_EMAIL, [5000, -500])

    print("Demo users ready:")
    print(f"Admin:  {DEMO_ADMIN_EMAIL} / {DEMO_ADMIN_PASSWORD}")
    print(f"Player: {DEMO_PLAYER_EMAIL} / {DEMO_PLAYER_PASSWORD}")


if __name__ == "__main__":
    main()
