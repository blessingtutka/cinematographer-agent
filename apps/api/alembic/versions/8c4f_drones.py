"""Persist director drone registrations."""

from alembic import op
import sqlalchemy as sa


revision = "8c4f_drones"
down_revision = "7b2f_scene_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "drones",
        sa.Column("drone_id", sa.String(length=64), primary_key=True),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("connection_type", sa.String(length=32), nullable=False, server_default="bluetooth"),
        sa.Column("bluetooth_device_id", sa.String(length=200), nullable=True),
        sa.Column("online", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_drones_owner_id", "drones", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_drones_owner_id", table_name="drones")
    op.drop_table("drones")