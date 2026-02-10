"""friends extras

Revision ID: 0008_friends_extras
Revises: 0007_friends_system
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008_friends_extras"
down_revision: Union[str, None] = "0007_friends_system"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "friendships",
        sa.Column("nickname", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "friend_messages",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint", sa.String(length=512), nullable=False, unique=True),
        sa.Column("p256dh", sa.String(length=256), nullable=False),
        sa.Column("auth", sa.String(length=256), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_push_subscriptions_user_id",
        "push_subscriptions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_column("friend_messages", "read_at")
    op.drop_column("friendships", "nickname")
