"""Tests for password-based auth routes."""

from __future__ import annotations

from httpx import AsyncClient


VALID_EMAIL = "alice@example.com"
VALID_PASSWORD = "supersecret123"
VALID_NAME = "Alice"


async def _register(
    client: AsyncClient,
    email: str = VALID_EMAIL,
    password: str = VALID_PASSWORD,
    name: str | None = VALID_NAME,
):
    payload = {"email": email, "password": password}
    if name is not None:
        payload["name"] = name
    return await client.post("/api/v1/auth/register", json=payload)


async def test_register_success(client: AsyncClient) -> None:
    resp = await _register(client)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    assert body["user"]["email"] == VALID_EMAIL
    assert body["user"]["name"] == VALID_NAME
    assert "id" in body["user"]


async def test_register_duplicate_email(client: AsyncClient) -> None:
    first = await _register(client)
    assert first.status_code == 200
    second = await _register(client)
    assert second.status_code == 400
    assert "already registered" in second.json()["detail"].lower()


async def test_register_short_password(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": VALID_EMAIL, "password": "short"},
    )
    assert resp.status_code == 422


async def test_register_invalid_email(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": VALID_PASSWORD},
    )
    assert resp.status_code == 422


async def test_login_success(client: AsyncClient) -> None:
    reg = await _register(client)
    assert reg.status_code == 200

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": VALID_EMAIL, "password": VALID_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == VALID_EMAIL


async def test_login_wrong_password(client: AsyncClient) -> None:
    reg = await _register(client)
    assert reg.status_code == 200

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": VALID_EMAIL, "password": "wrongpassword"},
    )
    assert resp.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@example.com", "password": VALID_PASSWORD},
    )
    assert resp.status_code == 401


async def test_me_authenticated(client: AsyncClient) -> None:
    reg = await _register(client)
    assert reg.status_code == 200
    token = reg.json()["access_token"]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == VALID_EMAIL
    assert body["name"] == VALID_NAME
    assert "id" in body


async def test_me_unauthenticated(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_invalid_token(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
