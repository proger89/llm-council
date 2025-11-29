"""
API endpoint tests.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_get_models(client: AsyncClient):
    """Test models endpoint."""
    response = await client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "chairman" in data
    assert len(data["models"]) == 3


@pytest.mark.asyncio
async def test_create_chat(client: AsyncClient):
    """Test creating a new chat."""
    response = await client.post("/api/chats", json={"title": "Test Chat"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Chat"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_chat_default_title(client: AsyncClient):
    """Test creating a chat with default title."""
    response = await client.post("/api/chats", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Chat"


@pytest.mark.asyncio
async def test_list_chats(client: AsyncClient):
    """Test listing chats."""
    # Create a few chats first
    await client.post("/api/chats", json={"title": "Chat 1"})
    await client.post("/api/chats", json={"title": "Chat 2"})
    
    response = await client.get("/api/chats")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_get_chat(client: AsyncClient):
    """Test getting a single chat."""
    # Create a chat
    create_response = await client.post("/api/chats", json={"title": "Test Chat"})
    chat_id = create_response.json()["id"]
    
    # Get the chat
    response = await client.get(f"/api/chats/{chat_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == chat_id
    assert data["title"] == "Test Chat"
    assert "messages" in data


@pytest.mark.asyncio
async def test_get_nonexistent_chat(client: AsyncClient):
    """Test getting a chat that doesn't exist."""
    response = await client.get("/api/chats/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_chat(client: AsyncClient):
    """Test deleting a chat."""
    # Create a chat
    create_response = await client.post("/api/chats", json={"title": "To Delete"})
    chat_id = create_response.json()["id"]
    
    # Delete the chat
    response = await client.delete(f"/api/chats/{chat_id}")
    assert response.status_code == 200
    
    # Verify it's deleted
    get_response = await client.get(f"/api/chats/{chat_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_update_chat(client: AsyncClient):
    """Test updating a chat title."""
    # Create a chat
    create_response = await client.post("/api/chats", json={"title": "Original"})
    chat_id = create_response.json()["id"]
    
    # Update the chat
    response = await client.patch(f"/api/chats/{chat_id}", json={"title": "Updated"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated"

