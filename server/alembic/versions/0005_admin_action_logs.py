"""admin action logs

Revision ID: 0005_admin_action_logs
Revises: 0004_game_logs
Create Date: 2026-01-20 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_admin_action_logs"
down_revision: Union[str, None] = "0004_game_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_action_logs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_user_id", sa.Uuid(), nullable=True),
        sa.Column("target_table_id", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_admin_action_logs_admin_id",
        "admin_action_logs",
        ["admin_id"],
        unique=False,
    )
    op.create_index(
        "ix_admin_action_logs_created_at",
        "admin_action_logs",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_admin_action_logs_created_at", table_name="admin_action_logs")
    op.drop_index("ix_admin_action_logs_admin_id", table_name="admin_action_logs")
    op.drop_table("admin_action_logs")
