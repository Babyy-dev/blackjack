"""crypto controls and moderation

Revision ID: 0006_crypto_controls
Revises: 0005_admin_action_logs
Create Date: 2026-01-22 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_crypto_controls"
down_revision: Union[str, None] = "0005_admin_action_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_banned",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column("users", sa.Column("banned_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("muted_until", sa.DateTime(timezone=True), nullable=True))

    op.add_column(
        "wallets",
        sa.Column("eth_deposit_address", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "wallets",
        sa.Column("sol_deposit_address", sa.String(length=128), nullable=True),
    )

    op.create_table(
        "wallet_deposit_addresses",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("wallet_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("chain", sa.String(length=16), nullable=False),
        sa.Column("address", sa.String(length=128), nullable=False),
        sa.Column("derivation_index", sa.Integer(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["wallet_id"], ["wallets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("chain", "address", name="uq_wallet_deposit_chain_address"),
        sa.UniqueConstraint("chain", "derivation_index", name="uq_wallet_deposit_chain_index"),
    )
    op.create_index(
        "ix_wallet_deposit_addresses_wallet_id",
        "wallet_deposit_addresses",
        ["wallet_id"],
        unique=False,
    )
    op.create_index(
        "ix_wallet_deposit_addresses_user_id",
        "wallet_deposit_addresses",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "crypto_deposits",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("wallet_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("chain", sa.String(length=16), nullable=False),
        sa.Column("address", sa.String(length=128), nullable=False),
        sa.Column("tx_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("amount_base", sa.BigInteger(), nullable=False),
        sa.Column("amount_tokens", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=24),
            nullable=False,
            server_default=sa.text("'confirmed'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["wallet_id"], ["wallets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_crypto_deposits_wallet_id",
        "crypto_deposits",
        ["wallet_id"],
        unique=False,
    )
    op.create_index(
        "ix_crypto_deposits_user_id",
        "crypto_deposits",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "crypto_withdrawals",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("transaction_id", sa.Uuid(), nullable=True),
        sa.Column("wallet_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("chain", sa.String(length=16), nullable=False),
        sa.Column("address", sa.String(length=128), nullable=False),
        sa.Column("amount_tokens", sa.Integer(), nullable=False),
        sa.Column("amount_base", sa.BigInteger(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=24),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("tx_hash", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["wallet_transactions.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(["wallet_id"], ["wallets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_crypto_withdrawals_wallet_id",
        "crypto_withdrawals",
        ["wallet_id"],
        unique=False,
    )
    op.create_index(
        "ix_crypto_withdrawals_user_id",
        "crypto_withdrawals",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_crypto_withdrawals_user_id", table_name="crypto_withdrawals")
    op.drop_index("ix_crypto_withdrawals_wallet_id", table_name="crypto_withdrawals")
    op.drop_table("crypto_withdrawals")
    op.drop_index("ix_crypto_deposits_user_id", table_name="crypto_deposits")
    op.drop_index("ix_crypto_deposits_wallet_id", table_name="crypto_deposits")
    op.drop_table("crypto_deposits")
    op.drop_index(
        "ix_wallet_deposit_addresses_user_id",
        table_name="wallet_deposit_addresses",
    )
    op.drop_index(
        "ix_wallet_deposit_addresses_wallet_id",
        table_name="wallet_deposit_addresses",
    )
    op.drop_table("wallet_deposit_addresses")
    op.drop_column("wallets", "sol_deposit_address")
    op.drop_column("wallets", "eth_deposit_address")
    op.drop_column("users", "muted_until")
    op.drop_column("users", "banned_until")
    op.drop_column("users", "is_banned")
