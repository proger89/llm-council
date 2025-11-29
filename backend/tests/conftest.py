"""
Pytest configuration and fixtures.
"""
import os
import sys
import asyncio
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Set test environment
os.environ["DATA_DIR"] = "./test_data"
os.environ["OPENROUTER_API_KEY"] = "test-key"

from backend.main import app
from backend.database import Base, get_session


# Create test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_data/test.db"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_session():
    """Override database session for testing."""
    async with test_async_session() as session:
        yield session


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_database():
    """Setup test database before each test."""
    # Create test data directory
    Path("./test_data").mkdir(exist_ok=True)
    
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Override dependency
    app.dependency_overrides[get_session] = override_get_session
    
    yield
    
    # Cleanup
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def db_session():
    """Get database session for tests."""
    async with test_async_session() as session:
        yield session

