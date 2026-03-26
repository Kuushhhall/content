"""Database connection and session management."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import Settings

log = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class Database:
    """Async database connection manager."""

    def __init__(self, database_url: str) -> None:
        self.engine = create_async_engine(
            database_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async def close(self) -> None:
        """Close the database engine."""
        await self.engine.dispose()

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get an async database session."""
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def create_all(self) -> None:
        """Create all tables."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def drop_all(self) -> None:
        """Drop all tables."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


# Global database instance
_db: Database | None = None


def get_database() -> Database | None:
    """Get the global database instance."""
    return _db


async def init_database(settings: Settings) -> Database:
    """Initialize the database connection."""
    global _db
    
    if not settings.database_url:
        log.warning("No DATABASE_URL configured — using in-memory storage")
        return None
    
    _db = Database(settings.database_url)
    log.info("Database connection initialized")
    
    # Create tables if they don't exist
    await _db.create_all()
    log.info("Database tables verified/created")
    
    return _db


async def close_database() -> None:
    """Close the database connection."""
    global _db
    if _db:
        await _db.close()
        _db = None
        log.info("Database connection closed")