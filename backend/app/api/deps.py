from typing import Annotated, AsyncGenerator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.database import get_database
from app.state.store import StateStore


def get_store(request: Request) -> StateStore:
    return request.app.state.store


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession | None, None]:
    """Get database session if database is configured.
    
    The session is kept open for the duration of the request and
    automatically committed/rolled back when the dependency exits.
    """
    db = getattr(request.app.state, "db", None)
    if db:
        async with db.session() as session:
            yield session
    else:
        yield None


StoreDep = Annotated[StateStore, Depends(get_store)]
SettingsDep = Annotated[Settings, Depends(get_app_settings)]
DBSessionDep = Annotated[AsyncSession | None, Depends(get_db_session)]
