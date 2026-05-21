import pytest
from httpx import AsyncClient


async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


async def test_openapi_available(client: AsyncClient):
    response = await client.get("/api/openapi.json")
    assert response.status_code == 200
