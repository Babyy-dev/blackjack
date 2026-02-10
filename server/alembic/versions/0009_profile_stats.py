"""profile stats columns

Revision ID: 0009_profile_stats
Revises: 0008_friends_extras
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009_profile_stats"
down_revision: Union[str, None] = "0008_friends_extras"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("wins", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "profiles",
        sa.Column("losses", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "profiles",
        sa.Column("hands_played", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "profiles",
        sa.Column("biggest_win", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "profiles",
        sa.Column("total_winnings", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
    )


def downgrade() -> None:
    op.drop_column("profiles", "total_winnings")
    op.drop_column("profiles", "biggest_win")
    op.drop_column("profiles", "hands_played")
    op.drop_column("profiles", "losses")
    op.drop_column("profiles", "wins")
