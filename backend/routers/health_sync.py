from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import os
import urllib.parse
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from deps import get_async_db, get_current_user
from models import User, HealthMetric

router = APIRouter(prefix="/health-sync", tags=["Health Sync"])


class SyncCallback(BaseModel):
    code: str


class AppleHealthPayload(BaseModel):
    sleep_minutes: int
    deep_sleep_minutes: int = 0
    date: str
    source: str = "apple_health"


class HealthMetricCreate(BaseModel):
    metric_type: str
    value: float
    unit: Optional[str] = None
    source: Optional[str] = None
    recorded_at: Optional[datetime] = None


class HealthMetricOut(BaseModel):
    id: str
    metric_type: str
    value: float
    unit: Optional[str] = None
    source: Optional[str] = None
    recorded_at: str

    class Config:
        from_attributes = True


@router.get("/google/login-url")
def get_google_login_url():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID")
    redirect_uri = "http://localhost:3000"
    scope = "https://www.googleapis.com/auth/fitness.sleep.read"
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        "response_type=code&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"scope={urllib.parse.quote(scope)}&"
        "access_type=offline&"
        "prompt=consent"
    )
    return {"url": url}


@router.post("/google/callback")
async def handle_google_callback(
    payload: SyncCallback,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user),
):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID")

    if client_id == "YOUR_CLIENT_ID" or not payload.code:
        now = datetime.now(timezone.utc)
        mock_metrics = [
            HealthMetric(
                user_id=user.id,
                metric_type="sleep_minutes",
                value=465,
                unit="min",
                source="xiaomi_mi_watch",
                recorded_at=now,
                extra_data={"sleep_score": 88, "deep_sleep_pct": 28, "mock": True},
            ),
        ]
        for m in mock_metrics:
            db.add(m)
        await db.commit()

        return {
            "status": "success",
            "message": "[MOCK] Mi Watch Sync via Google Fit simulado e salvo!",
            "metrics_saved": len(mock_metrics),
        }

    return {"status": "error", "message": "Chaves GOOGLE_CLIENT_ID reais não configuradas."}


@router.post("/apple-webhook")
async def receive_apple_health_webhook(
    payload: AppleHealthPayload,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user),
):
    metric = HealthMetric(
        user_id=user.id,
        metric_type="sleep_minutes",
        value=payload.sleep_minutes,
        unit="min",
        source=payload.source,
        recorded_at=datetime.fromisoformat(payload.date) if payload.date else datetime.now(timezone.utc),
        extra_data={"deep_sleep_minutes": payload.deep_sleep_minutes},
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)

    return {
        "status": "success",
        "id": str(metric.id),
        "message": f"Recebido {payload.sleep_minutes} min de sono do Apple Health!",
    }


@router.get("/metrics", response_model=List[HealthMetricOut])
async def list_health_metrics(
    metric_type: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    query = select(HealthMetric).where(
        and_(
            HealthMetric.user_id == user.id,
            HealthMetric.recorded_at >= since,
        )
    )
    if metric_type:
        query = query.where(HealthMetric.metric_type == metric_type)

    query = query.order_by(desc(HealthMetric.recorded_at))
    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        HealthMetricOut(
            id=str(r.id),
            metric_type=r.metric_type,
            value=r.value,
            unit=r.unit,
            source=r.source,
            recorded_at=r.recorded_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/metrics", response_model=HealthMetricOut)
async def create_health_metric(
    body: HealthMetricCreate,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    metric = HealthMetric(
        user_id=user.id,
        metric_type=body.metric_type,
        value=body.value,
        unit=body.unit,
        source=body.source,
        recorded_at=body.recorded_at or now,
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)

    return HealthMetricOut(
        id=str(metric.id),
        metric_type=metric.metric_type,
        value=metric.value,
        unit=metric.unit,
        source=metric.source,
        recorded_at=metric.recorded_at.isoformat(),
    )
