"""game logs

Revision ID: 0004_game_logs
Revises: 0003_wallet_addresses
Create Date: 2026-01-16 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_game_logs"
down_revision: Union[str, None] = "0003_wallet_addresses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_rounds",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("table_id", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.JSON(), nullable=True),
    )
    op.create_index("ix_game_rounds_table_id", "game_rounds", ["table_id"], unique=False)

    op.create_table(
        "game_action_logs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("table_id", sa.String(length=64), nullable=False),
        sa.Column("round_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["round_id"], ["game_rounds.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_game_action_logs_table_id", "game_action_logs", ["table_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_game_action_logs_table_id", table_name="game_action_logs")
    op.drop_table("game_action_logs")
    op.drop_index("ix_game_rounds_table_id", table_name="game_rounds")
    op.drop_table("game_rounds")
