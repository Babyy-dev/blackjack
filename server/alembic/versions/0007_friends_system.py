"""friends system

Revision ID: 0007_friends_system
Revises: 0006_crypto_controls
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007_friends_system"
down_revision: Union[str, None] = "0006_crypto_controls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "friend_requests",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("requester_id", sa.Uuid(), nullable=False),
        sa.Column("addressee_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=24),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["addressee_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_friend_requests_requester_id",
        "friend_requests",
        ["requester_id"],
        unique=False,
    )
    op.create_index(
        "ix_friend_requests_addressee_id",
        "friend_requests",
        ["addressee_id"],
        unique=False,
    )

    op.create_table(
        "friendships",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("friend_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["friend_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "friend_id", name="uq_friendships_pair"),
    )
    op.create_index(
        "ix_friendships_user_id",
        "friendships",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_friendships_friend_id",
        "friendships",
        ["friend_id"],
        unique=False,
    )

    op.create_table(
        "user_blocks",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("blocker_id", sa.Uuid(), nullable=False),
        sa.Column("blocked_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["blocker_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocked_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_pair"),
    )
    op.create_index(
        "ix_user_blocks_blocker_id",
        "user_blocks",
        ["blocker_id"],
        unique=False,
    )
    op.create_index(
        "ix_user_blocks_blocked_id",
        "user_blocks",
        ["blocked_id"],
        unique=False,
    )

    op.create_table(
        "friend_messages",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("sender_id", sa.Uuid(), nullable=False),
        sa.Column("recipient_id", sa.Uuid(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_friend_messages_sender_id",
        "friend_messages",
        ["sender_id"],
        unique=False,
    )
    op.create_index(
        "ix_friend_messages_recipient_id",
        "friend_messages",
        ["recipient_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_friend_messages_recipient_id", table_name="friend_messages")
    op.drop_index("ix_friend_messages_sender_id", table_name="friend_messages")
    op.drop_table("friend_messages")
    op.drop_index("ix_user_blocks_blocked_id", table_name="user_blocks")
    op.drop_index("ix_user_blocks_blocker_id", table_name="user_blocks")
    op.drop_table("user_blocks")
    op.drop_index("ix_friendships_friend_id", table_name="friendships")
    op.drop_index("ix_friendships_user_id", table_name="friendships")
    op.drop_table("friendships")
    op.drop_index("ix_friend_requests_addressee_id", table_name="friend_requests")
    op.drop_index("ix_friend_requests_requester_id", table_name="friend_requests")
    op.drop_table("friend_requests")
