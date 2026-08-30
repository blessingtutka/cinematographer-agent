from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.project import ProjectModel
from app.models.user import UserModel


def get_project_count(db: Session, user: UserModel) -> int:
    return db.query(func.count(ProjectModel.project_id)).filter(ProjectModel.owner_id == user.id).scalar() or 0


def can_create_project(db: Session, user: UserModel) -> tuple[bool, int, int | None]:
    """
    Returns (allowed, current_count, limit). limit is None for unlimited
    (Enterprise).
    """
    limit = user.project_limit
    current_count = get_project_count(db, user)

    if limit is None:
        return True, current_count, None

    return current_count < limit, current_count, limit
