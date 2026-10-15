from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app import database as db_module
from app.config import settings
from app.database import Base, get_session
from app.main import app
from app.seed import seed


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a fresh engine in the test loop and seed data for each test."""
    engine = create_async_engine(settings.async_database_url, echo=False, future=True)
    db_module.engine = engine
    db_module.AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with db_module.AsyncSessionLocal() as session:
        await seed(session)

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with db_module.AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
    await engine.dispose()
