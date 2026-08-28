from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.project import ProjectModel
from app.models.scene import SceneModel

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


def _iso(value: datetime | str) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else value


def _project_response(project: ProjectModel) -> dict:
    return {
        "project_id": project.project_id,
        "title": project.title,
        "description": project.description,
        "created_at": _iso(project.created_at),
        "updated_at": _iso(project.updated_at),
    }


async def _get_project(project_id: str, db: AsyncSession) -> ProjectModel:
    project = (await db.execute(select(ProjectModel).where(ProjectModel.project_id == project_id))).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return project


@router.post("", status_code=201)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)) -> dict:
    project = ProjectModel(project_id=str(uuid4()), title=payload.title, description=payload.description)
    db.add(project)
    await db.flush()
    return _project_response(project)


@router.get("")
async def list_projects(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(ProjectModel).order_by(ProjectModel.updated_at.desc()))
    return [_project_response(project) for project in result.scalars().all()]


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    return _project_response(await _get_project(project_id, db))


@router.patch("/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate, db: AsyncSession = Depends(get_db)) -> dict:
    project = await _get_project(project_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    return _project_response(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)) -> None:
    project = await _get_project(project_id, db)
    await db.delete(project)


@router.get("/{project_id}/scenes")
async def list_project_scenes(project_id: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    await _get_project(project_id, db)
    result = await db.execute(
        select(SceneModel).where(SceneModel.project_id == project_id).order_by(SceneModel.created_at.desc())
    )
    return [
        {
            "scene_id": scene.scene_id,
            "project_id": scene.project_id,
            "title": scene.title,
            "created_at": _iso(scene.created_at),
            "updated_at": _iso(scene.updated_at),
        }
        for scene in result.scalars().all()
    ]