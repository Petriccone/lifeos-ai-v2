import os
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from models import User

JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SUPABASE_JWT_SECRET", "your-secret-key"))
JWT_ALGORITHM = "HS256"

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("VERCEL"):
        raise RuntimeError("DATABASE_URL is required in production")
    DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL", "sqlite:///./lifeos.db")

if DATABASE_URL.startswith("postgresql://"):
    async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    sync_database_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    _engine_kwargs = {"pool_pre_ping": True}
elif DATABASE_URL.startswith("sqlite:///"):
    async_database_url = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    sync_database_url = DATABASE_URL
    _engine_kwargs = {}
else:
    async_database_url = DATABASE_URL
    sync_database_url = DATABASE_URL
    _engine_kwargs = {"pool_pre_ping": True}

async_engine = create_async_engine(async_database_url, echo=False, **_engine_kwargs)

async_session_maker = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

sync_engine = create_engine(sync_database_url, echo=False)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

security = HTTPBearer(auto_error=False)


async def get_async_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db() -> Session:
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub") or payload.get("user_id")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return user

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
