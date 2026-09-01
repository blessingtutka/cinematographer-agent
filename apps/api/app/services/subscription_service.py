from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import ProjectModel
from app.models.user import UserModel


async def get_project_count(db: AsyncSession, user: UserModel) -> int:
    result = await db.execute(
        select(func.count(ProjectModel.project_id)).where(ProjectModel.owner_id == user.id)
    )
    return result.scalar() or 0


async def can_create_project(
    db: AsyncSession, user: UserModel
) -> tuple[bool, int, int | None]:
    """
    Returns (allowed, current_count, limit). limit is None for unlimited
    (Enterprise).
    """
    limit = user.project_limit
    current_count = await get_project_count(db, user)

    if limit is None:
        return True, current_count, None

    return current_count < limit, current_count, limit
