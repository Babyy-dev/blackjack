"""wallet addresses

Revision ID: 0003_wallet_addresses
Revises: 0002_wallets
Create Date: 2026-01-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_wallet_addresses"
down_revision: Union[str, None] = "0002_wallets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("wallets", sa.Column("eth_address", sa.String(length=128), nullable=True))
    op.add_column("wallets", sa.Column("sol_address", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("wallets", "sol_address")
    op.drop_column("wallets", "eth_address")
