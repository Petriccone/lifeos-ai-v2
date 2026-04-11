"""
Pytest configuration for backend tests.

Uses an in-memory SQLite database with a shared connection so that
schema/data created in one session is visible to the next session within
the same test. The FastAPI `get_async_db` dependency is overridden to
yield sessions bound to the test engine, leaving the real database
untouched.
"""

from __future__ import annotations

import os
import sqlite3
import sys
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

# Python 3.12+ removed implicit sqlite3 adapters for custom types
# (including uuid.UUID). Register one so that UUID primary-key defaults
# stored as String(36) round-trip correctly through aiosqlite.
sqlite3.register_adapter(uuid.UUID, str)

# Ensure backend/ is on sys.path so `import main` works when pytest is
# invoked from the backend/ directory.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Force a local sqlite URL BEFORE importing main, so the module-level
# engine creation in main.py doesn't try to connect to Postgres.
os.environ.setdefault("DATABASE_URL", "sqlite:///./_test_unused.db")
os.environ.setdefault("JWT_SECRET", "test-secret-key")

from main import app, get_async_db  # noqa: E402
from models import Base  # noqa: E402


@pytest_asyncio.fixture
async def test_engine():
    """Create a fresh in-memory SQLite engine per test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield engine
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


@pytest_asyncio.fixture
async def test_session_maker(test_engine):
    return async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture
async def client(test_session_maker) -> AsyncGenerator[AsyncClient, None]:
    """HTTPX AsyncClient bound to the FastAPI app via ASGITransport."""

    async def _override_get_async_db() -> AsyncGenerator[AsyncSession, None]:
        async with test_session_maker() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_async_db] = _override_get_async_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.pop(get_async_db, None)
