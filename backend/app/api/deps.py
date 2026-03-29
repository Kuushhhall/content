from typing import Annotated

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.state.store import StateStore


def get_store(request: Request) -> StateStore:
    return request.app.state.store


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


StoreDep = Annotated[StateStore, Depends(get_store)]
SettingsDep = Annotated[Settings, Depends(get_app_settings)]
