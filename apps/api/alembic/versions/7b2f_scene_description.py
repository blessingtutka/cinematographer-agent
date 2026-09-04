"""Add editable scene descriptions."""

from alembic import op
import sqlalchemy as sa


revision = "7b2f_scene_description"
down_revision = "3e4de354ea05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scenes", sa.Column("description", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("scenes", "description")