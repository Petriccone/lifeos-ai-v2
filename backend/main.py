"""
LifeOS AI - Backend API
FastAPI application for LifeOS AI Life Operating System
"""

import os
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import create_engine, desc, and_
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from passlib.context import CryptContext
import httpx

# Password hashing context (module-level)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Import models and agents
from models import (
    Base, User, MoodEntry, WorkoutSession, Exercise, WorkoutExercise,
    Task, DailyBrief,
    MoodEntryCreate, MoodEntryResponse,
    WorkoutSessionCreate,
    TaskCreate, TaskUpdate
)
from mood_detector import MoodDetector, MoodMetrics
from ai_agents import (
    MoodDetectorAgent, DailyBriefGeneratorAgent, 
    WeeklyInsightsAgent, ChatAgent, OpenRouterClient
)

# =============================================================================
# Configuration
# =============================================================================

# Database - async for Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    # In production (Railway, Vercel, etc) fail fast instead of silently falling back
    if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("VERCEL"):
        raise RuntimeError("DATABASE_URL is required in production")
    # Local dev fallback
    DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL", "sqlite:///./lifeos.db")

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SUPABASE_JWT_SECRET", "your-secret-key"))
JWT_ALGORITHM = "HS256"

# OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# =============================================================================
# Database Setup
# =============================================================================

# Normalize DATABASE_URL for async and sync drivers
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

# Create async engine
async_engine = create_async_engine(
    async_database_url,
    echo=False,
    **_engine_kwargs
)

# Async session factory
async_session_maker = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Sync engine for development
sync_engine = create_engine(sync_database_url, echo=False)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


# =============================================================================
# Dependencies
# =============================================================================

security = HTTPBearer(auto_error=False)


async def get_async_db() -> AsyncSession:
    """Async database session dependency."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db() -> Session:
    """Sync database session for development."""
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db)
) -> User:
    """
    Validate JWT and return current user.
    Uses Supabase JWT or custom JWT.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    token = credentials.credentials
    
    try:
        # Decode JWT
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub") or payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user from database
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == UUID(user_id)))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
        
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db)
) -> Optional[User]:
    """Optional user authentication for public endpoints."""
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# =============================================================================
# Pydantic Request/Response Models
# =============================================================================

class MoodEntryWithDetection(MoodEntryCreate):
    source_text: str = Field(..., description="Text to analyze for mood")


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    response: str
    mood_detected: Optional[Dict[str, float]] = None
    suggested_action: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


class MetricsSummary(BaseModel):
    anxiety: float
    happiness: float
    wellness: float
    sleep: float
    recovery: float
    energy: Optional[float]
    count: int


class AiWorkoutRequest(BaseModel):
    goal: str = Field("hypertrophy", description="strength, hypertrophy, fat_loss, endurance")
    level: str = Field("intermediate", description="beginner, intermediate, advanced")
    duration_minutes: int = Field(60, ge=10, le=180)
    workout_type: str = Field("push", description="push, pull, legs, full_body, cardio, upper, lower")
    equipment: List[str] = Field(default_factory=lambda: ["barbell", "dumbbell", "machine", "bodyweight", "cable"])
    notes: Optional[str] = Field(None, description="Free-text context like injuries, preferences, previous session")


class AiSetSuggestion(BaseModel):
    reps: int
    weight: float
    rpe: Optional[float] = None


class AiExerciseSuggestion(BaseModel):
    exercise_id: Optional[str] = None
    name: str
    muscle_group: Optional[str] = None
    sets: List[AiSetSuggestion]
    notes: Optional[str] = None


class AiWorkoutResponse(BaseModel):
    name: str
    workout_type: str
    duration_minutes: int
    notes: Optional[str]
    exercises: List[AiExerciseSuggestion]
    model: str


# =============================================================================
# Lifespan
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("LifeOS AI Backend starting up...")
    
    # Create tables (for development - in production use migrations)
    if os.getenv("CREATE_TABLES", "false").lower() == "true":
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Shutdown
    print("LifeOS AI Backend shutting down...")
    await async_engine.dispose()


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="LifeOS AI API",
    description="Personal AI Life Management System API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration (env-driven, comma-separated list)
_cors_default = "http://localhost:3000,https://lifeos.ai"
_cors_env = os.getenv("CORS_ORIGINS", _cors_default)
cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.up\.railway\.app|https://.*\.vercel\.app|https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register health sync router for Xiaomi Mi Watch 5 / Google Fit integration
from routers.health_sync import router as health_sync_router
app.include_router(health_sync_router, prefix="/api/v1")
# =============================================================================
# Health & Status
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow()
    )


@app.get("/api/v1/health")
async def health_check_v1():
    """Health check v1."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# =============================================================================
# Auth Routes
# =============================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict  # {id, email, name}


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]


def _create_access_token(user: User) -> str:
    """Create a 30-day JWT for the given user."""
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)


@app.post("/api/v1/auth/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_async_db),
) -> AuthResponse:
    """Register a new user with email + password and return a JWT (auto-login)."""
    from sqlalchemy import select

    # Check if email exists
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password and create user
    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=pwd_context.hash(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = _create_access_token(user)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={"id": str(user.id), "email": user.email, "name": user.name},
    )


@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_async_db),
) -> AuthResponse:
    """Authenticate a user with email + password and return a JWT."""
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not pwd_context.verify(
        payload.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = _create_access_token(user)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={"id": str(user.id), "email": user.email, "name": user.name},
    )


@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the currently authenticated user."""
    return UserResponse(id=str(user.id), email=user.email, name=user.name)


# =============================================================================
# Mood Routes
# =============================================================================

@app.get("/api/v1/mood", response_model=List[MoodEntryResponse])
async def get_mood_entries(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get mood entries for the last N days."""
    from sqlalchemy import select
    
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(MoodEntry)
        .where(
            and_(
                MoodEntry.user_id == user.id,
                MoodEntry.recorded_at >= since
            )
        )
        .order_by(desc(MoodEntry.recorded_at))
    )
    entries = result.scalars().all()
    
    return [
        MoodEntryResponse(
            id=e.id,
            user_id=e.user_id,
            recorded_at=e.recorded_at,
            anxiety=e.anxiety,
            happiness=e.happiness,
            wellness=e.wellness,
            sleep=e.sleep,
            recovery=e.recovery,
            energy=e.energy,
            source_text=e.source_text
        )
        for e in entries
    ]


@app.post("/api/v1/mood", response_model=MoodEntryResponse)
async def create_mood_entry(
    entry: MoodEntryCreate,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Create a new mood entry manually."""
    mood_entry = MoodEntry(
        user_id=user.id,
        anxiety=entry.anxiety,
        happiness=entry.happiness,
        wellness=entry.wellness,
        sleep=entry.sleep,
        recovery=entry.recovery,
        energy=entry.energy,
        source_text=entry.source_text,
        extra_data={"source": "manual"}
    )
    
    db.add(mood_entry)
    await db.commit()
    await db.refresh(mood_entry)
    
    return MoodEntryResponse(
        id=mood_entry.id,
        user_id=mood_entry.user_id,
        recorded_at=mood_entry.recorded_at,
        anxiety=mood_entry.anxiety,
        happiness=mood_entry.happiness,
        wellness=mood_entry.wellness,
        sleep=mood_entry.sleep,
        recovery=mood_entry.recovery,
        energy=mood_entry.energy,
        source_text=mood_entry.source_text
    )


@app.post("/api/v1/mood/detect", response_model=MoodEntryResponse)
async def detect_and_create_mood(
    text: str,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """
    Detect mood from text and create a mood entry.
    Uses Claude via OpenRouter.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service not configured"
        )
    
    # Detect mood
    detector = MoodDetector(api_key=OPENROUTER_API_KEY)
    metrics = await detector.detect(text)
    
    # Create entry
    mood_entry = MoodEntry(
        user_id=user.id,
        anxiety=metrics.anxiety,
        happiness=metrics.happiness,
        wellness=metrics.wellness,
        sleep=metrics.sleep,
        recovery=metrics.recovery,
        energy=metrics.energy,
        source_text=text,
        extra_data={
            "source": "ai_detection",
            "confidence": metrics.confidence,
            "reasoning": metrics.reasoning
        }
    )
    
    db.add(mood_entry)
    await db.commit()
    await db.refresh(mood_entry)
    
    return MoodEntryResponse(
        id=mood_entry.id,
        user_id=mood_entry.user_id,
        recorded_at=mood_entry.recorded_at,
        anxiety=mood_entry.anxiety,
        happiness=mood_entry.happiness,
        wellness=mood_entry.wellness,
        sleep=mood_entry.sleep,
        recovery=mood_entry.recovery,
        energy=mood_entry.energy,
        source_text=mood_entry.source_text
    )


@app.get("/api/v1/mood/summary", response_model=MetricsSummary)
async def get_mood_summary(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get averaged mood metrics over a period."""
    from sqlalchemy import select, func
    
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(func.avg(MoodEntry.anxiety),
               func.avg(MoodEntry.happiness),
               func.avg(MoodEntry.wellness),
               func.avg(MoodEntry.sleep),
               func.avg(MoodEntry.recovery),
               func.avg(MoodEntry.energy),
               func.count(MoodEntry.id))
        .where(
            and_(
                MoodEntry.user_id == user.id,
                MoodEntry.recorded_at >= since
            )
        )
    )
    row = result.one()
    
    return MetricsSummary(
        anxiety=row[0] or 50.0,
        happiness=row[1] or 50.0,
        wellness=row[2] or 50.0,
        sleep=row[3] or 50.0,
        recovery=row[4] or 50.0,
        energy=row[5],
        count=row[6] or 0
    )


# =============================================================================
# Workout Routes
# =============================================================================

@app.get("/api/v1/workouts")
async def get_workouts(
    days: int = Query(30, ge=1, le=180),
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get workout sessions."""
    from sqlalchemy import select
    
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(WorkoutSession)
        .where(
            and_(
                WorkoutSession.user_id == user.id,
                WorkoutSession.started_at >= since
            )
        )
        .order_by(desc(WorkoutSession.started_at))
    )
    sessions = result.scalars().all()
    
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "workout_type": s.workout_type,
            "started_at": s.started_at.isoformat(),
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "duration_minutes": s.duration_minutes,
            "calories_burned": s.calories_burned,
            "notes": s.notes
        }
        for s in sessions
    ]


@app.post("/api/v1/workouts", response_model=dict)
async def create_workout(
    workout: WorkoutSessionCreate,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Create a new workout session."""
    session = WorkoutSession(
        user_id=user.id,
        name=workout.name,
        workout_type=workout.workout_type,
        duration_minutes=workout.duration_minutes,
        notes=workout.notes,
        started_at=datetime.utcnow()
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Add exercises if provided
    if workout.exercises:
        for i, ex_data in enumerate(workout.exercises):
            exercise = WorkoutExercise(
                session_id=session.id,
                exercise_id=ex_data.get("exercise_id"),
                order=i,
                sets=ex_data.get("sets", []),
                notes=ex_data.get("notes")
            )
            db.add(exercise)
        
        await db.commit()
    
    return {"id": str(session.id), "message": "Workout created"}


@app.get("/api/v1/workouts/{workout_id}")
async def get_workout(
    workout_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get a specific workout with exercises."""
    from sqlalchemy import select
    
    result = await db.execute(
        select(WorkoutSession)
        .where(
            and_(
                WorkoutSession.id == workout_id,
                WorkoutSession.user_id == user.id
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    # Get exercises
    exercises_result = await db.execute(
        select(WorkoutExercise, Exercise)
        .join(Exercise)
        .where(WorkoutExercise.session_id == session.id)
        .order_by(WorkoutExercise.order)
    )
    
    exercises = [
        {
            "id": str(we.id),
            "name": ex.name,
            "sets": we.sets,
            "notes": we.notes
        }
        for we, ex in exercises_result
    ]
    
    return {
        "id": str(session.id),
        "name": session.name,
        "workout_type": session.workout_type,
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "duration_minutes": session.duration_minutes,
        "calories_burned": session.calories_burned,
        "notes": session.notes,
        "exercises": exercises
    }


# =============================================================================
# AI Workout Generator
# =============================================================================

@app.post("/api/v1/workouts/ai-generate", response_model=AiWorkoutResponse)
async def ai_generate_workout(
    request: AiWorkoutRequest,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user),
):
    """
    Generate a personalized workout plan via Claude (OpenRouter).

    The model receives the user's exercise library (so it only picks names
    that exist) plus goal/level/equipment/duration and returns a structured
    JSON plan. We then match names back to library IDs before responding.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service not configured",
        )

    from sqlalchemy import select

    # Load library scoped to the user's equipment selection
    library_result = await db.execute(select(Exercise))
    library = library_result.scalars().all()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Exercise library is empty. Seed exercises first.",
        )

    equipment_set = {e.lower() for e in request.equipment}
    available = [
        ex
        for ex in library
        if not ex.equipment or ex.equipment.lower() in equipment_set
    ]
    if not available:
        available = list(library)  # fall back to full library if filter empties

    # Build a compact library listing for the prompt
    library_lines = [
        f"- {ex.name} | muscle: {ex.muscle_group or 'general'} | equip: {ex.equipment or 'any'} | type: {ex.exercise_type or 'general'}"
        for ex in available
    ]
    library_text = "\n".join(library_lines)

    # Recent workout context (last 5) so the AI can progress the user
    history_result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .order_by(desc(WorkoutSession.started_at))
        .limit(5)
    )
    recent_sessions = history_result.scalars().all()
    history_lines = [
        f"- {s.workout_type or 'workout'} ({s.duration_minutes or 0}min)"
        + (f": {s.notes}" if s.notes else "")
        for s in recent_sessions
    ]
    history_text = "\n".join(history_lines) if history_lines else "(no previous sessions)"

    system_prompt = """You are an expert strength and conditioning coach.
You design personalized workout plans using ONLY exercises from the provided library.
You always respond with valid JSON matching the exact schema given - no prose, no markdown fences.
You pick exercises that match the user's goal, level, available equipment, and time budget.
You set realistic weights in kilograms based on the level (beginner: light, intermediate: moderate, advanced: heavy).
For bodyweight exercises, use weight=0."""

    user_prompt = f"""Generate a {request.workout_type.upper()} workout.

USER PROFILE:
- Goal: {request.goal}
- Level: {request.level}
- Time budget: {request.duration_minutes} minutes
- Equipment available: {", ".join(request.equipment)}
- Extra notes: {request.notes or "none"}

RECENT SESSIONS:
{history_text}

EXERCISE LIBRARY (use ONLY names from this list, matching exactly):
{library_text}

RESPONSE FORMAT (strict JSON, no markdown):
{{
  "name": "Short session title",
  "workout_type": "{request.workout_type}",
  "duration_minutes": {request.duration_minutes},
  "notes": "One-line coaching cue or progression tip",
  "exercises": [
    {{
      "name": "exact name from library",
      "sets": [
        {{"reps": 8, "weight": 60.0, "rpe": 7}},
        {{"reps": 8, "weight": 60.0, "rpe": 7}},
        {{"reps": 8, "weight": 60.0, "rpe": 8}}
      ],
      "notes": "optional form cue"
    }}
  ]
}}

Rules:
- Pick 4-7 exercises for strength/hypertrophy, 3-5 for cardio/full body
- Compound movements first, then isolation
- 3-5 sets per exercise for strength/hypertrophy
- Weights in kilograms, realistic for the level
- For bodyweight movements use weight=0
- Keep the whole plan within the time budget ({request.duration_minutes} min including rest)
- Return ONLY the JSON object, nothing else"""

    client = OpenRouterClient(api_key=OPENROUTER_API_KEY)
    ai_response = await client.chat(
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
        temperature=0.5,
        max_tokens=2000,
    )

    raw_content = ai_response.content.strip()
    # Strip ``` fences if Claude ignored instructions
    if raw_content.startswith("```"):
        lines = raw_content.splitlines()
        # Drop the first fence line and any language tag, and the closing fence
        raw_content = "\n".join(
            ln for ln in lines[1:] if not ln.strip().startswith("```")
        )
    # Some models prepend prose — try to locate the first `{` and last `}`
    first_brace = raw_content.find("{")
    last_brace = raw_content.rfind("}")
    if first_brace >= 0 and last_brace > first_brace:
        raw_content = raw_content[first_brace : last_brace + 1]

    import json as _json
    try:
        parsed = _json.loads(raw_content)
    except _json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI returned invalid JSON: {e}",
        )

    # Build name → id map for library lookup (case insensitive)
    name_to_id = {ex.name.lower(): (str(ex.id), ex.muscle_group) for ex in library}

    raw_exercises = parsed.get("exercises") or []
    exercises: List[AiExerciseSuggestion] = []
    for ex in raw_exercises:
        name = str(ex.get("name", "")).strip()
        if not name:
            continue
        match = name_to_id.get(name.lower())
        exercise_id, muscle_group = match if match else (None, None)

        sets_raw = ex.get("sets") or []
        sets: List[AiSetSuggestion] = []
        for s in sets_raw:
            try:
                sets.append(
                    AiSetSuggestion(
                        reps=int(s.get("reps", 0) or 0),
                        weight=float(s.get("weight", 0) or 0),
                        rpe=(float(s["rpe"]) if s.get("rpe") is not None else None),
                    )
                )
            except (ValueError, TypeError):
                continue

        if not sets:
            continue

        exercises.append(
            AiExerciseSuggestion(
                exercise_id=exercise_id,
                name=name,
                muscle_group=muscle_group,
                sets=sets,
                notes=ex.get("notes"),
            )
        )

    if not exercises:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI response had no usable exercises",
        )

    return AiWorkoutResponse(
        name=str(parsed.get("name", f"{request.workout_type.title()} Session")),
        workout_type=str(parsed.get("workout_type", request.workout_type)),
        duration_minutes=int(parsed.get("duration_minutes", request.duration_minutes)),
        notes=parsed.get("notes"),
        exercises=exercises,
        model=ai_response.model,
    )


# =============================================================================
# Exercise Routes
# =============================================================================

@app.get("/api/v1/exercises")
async def get_exercises(
    muscle_group: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Get available exercises."""
    from sqlalchemy import select
    
    query = select(Exercise)
    if muscle_group:
        query = query.where(Exercise.muscle_group == muscle_group)
    
    result = await db.execute(query.order_by(Exercise.name))
    exercises = result.scalars().all()
    
    return [
        {
            "id": str(e.id),
            "name": e.name,
            "muscle_group": e.muscle_group,
            "equipment": e.equipment,
            "exercise_type": e.exercise_type
        }
        for e in exercises
    ]


@app.post("/api/v1/exercises", response_model=dict)
async def create_exercise(
    name: str,
    muscle_group: Optional[str] = None,
    equipment: Optional[str] = None,
    exercise_type: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new exercise."""
    exercise = Exercise(
        name=name,
        muscle_group=muscle_group,
        equipment=equipment,
        exercise_type=exercise_type
    )
    
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    
    return {"id": str(exercise.id), "name": exercise.name}


# =============================================================================
# Task Routes
# =============================================================================

@app.get("/api/v1/tasks")
async def get_tasks(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get tasks for the current user."""
    from sqlalchemy import select
    
    query = select(Task).where(Task.user_id == user.id)
    
    if status:
        query = query.where(Task.status == status)
    if category:
        query = query.where(Task.category == category)
    
    query = query.order_by(desc(Task.created_at)).limit(limit)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    return [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "category": t.category,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "created_at": t.created_at.isoformat()
        }
        for t in tasks
    ]


@app.post("/api/v1/tasks", response_model=dict)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Create a new task."""
    new_task = Task(
        user_id=user.id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        category=task.category,
        due_date=task.due_date
    )
    
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    
    return {
        "id": str(new_task.id),
        "title": new_task.title,
        "status": new_task.status,
        "message": "Task created"
    }


@app.patch("/api/v1/tasks/{task_id}")
async def update_task(
    task_id: UUID,
    updates: TaskUpdate,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Update a task."""
    from sqlalchemy import select
    
    result = await db.execute(
        select(Task).where(
            and_(Task.id == task_id, Task.user_id == user.id)
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update fields
    update_data = updates.dict(exclude_unset=True)
    
    # Handle status change to completed
    if update_data.get("status") == "completed" and task.status != "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(task, key, value)
    
    await db.commit()
    
    return {"message": "Task updated", "id": str(task_id)}


@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Delete a task."""
    from sqlalchemy import select
    
    result = await db.execute(
        select(Task).where(
            and_(Task.id == task_id, Task.user_id == user.id)
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task deleted"}


# =============================================================================
# Daily Brief Routes
# =============================================================================

@app.get("/api/v1/brief")
async def get_today_brief(
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get or generate today's daily brief."""
    from sqlalchemy import select
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = await db.execute(
        select(DailyBrief)
        .where(
            and_(
                DailyBrief.user_id == user.id,
                DailyBrief.date >= today_start
            )
        )
        .order_by(desc(DailyBrief.created_at))
        .limit(1)
    )
    brief = result.scalar_one_or_none()
    
    if brief:
        return {
            "id": str(brief.id),
            "date": brief.date.isoformat(),
            "summary": brief.summary,
            "mood_insight": brief.mood_insight,
            "workout_insight": brief.workout_insight,
            "task_insight": brief.task_insight,
            "recommendations": brief.recommendations or [],
            "model": brief.model
        }
    
    # Generate new brief
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service not configured"
        )
    
    # Get recent data
    since = datetime.utcnow() - timedelta(days=7)
    
    mood_result = await db.execute(
        select(MoodEntry)
        .where(
            and_(
                MoodEntry.user_id == user.id,
                MoodEntry.recorded_at >= since
            )
        )
    )
    mood_entries = mood_result.scalars().all()
    
    workout_result = await db.execute(
        select(WorkoutSession)
        .where(
            and_(
                WorkoutSession.user_id == user.id,
                WorkoutSession.started_at >= since
            )
        )
    )
    workout_sessions = workout_result.scalars().all()
    
    task_result = await db.execute(
        select(Task).where(Task.user_id == user.id)
    )
    tasks = task_result.scalars().all()
    
    # Generate brief using AI
    client = OpenRouterClient(api_key=OPENROUTER_API_KEY)
    agent = DailyBriefGeneratorAgent(client)
    
    brief_data = await agent.generate(
        user=user,
        mood_entries=mood_entries,
        workout_sessions=workout_sessions,
        tasks=tasks
    )
    
    # Save brief
    new_brief = DailyBrief(
        user_id=user.id,
        date=datetime.utcnow(),
        summary=brief_data["summary"],
        mood_insight=brief_data.get("mood_insight"),
        workout_insight=brief_data.get("workout_insight"),
        task_insight=brief_data.get("task_insight"),
        recommendations=brief_data.get("recommendations", []),
        metrics_snapshot=brief_data.get("metrics_snapshot"),
        model=brief_data.get("model")
    )
    
    db.add(new_brief)
    await db.commit()
    await db.refresh(new_brief)
    
    return {
        "id": str(new_brief.id),
        "date": new_brief.date.isoformat(),
        "summary": new_brief.summary,
        "mood_insight": new_brief.mood_insight,
        "workout_insight": new_brief.workout_insight,
        "task_insight": new_brief.task_insight,
        "recommendations": new_brief.recommendations or [],
        "model": new_brief.model
    }


# =============================================================================
# Weekly Insights Routes
# =============================================================================

@app.get("/api/v1/insights/weekly")
async def get_weekly_insights(
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """Get weekly insights and trends."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service not configured"
        )
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    # Get data
    mood_result = await db.execute(
        select(MoodEntry)
        .where(
            and_(
                MoodEntry.user_id == user.id,
                MoodEntry.recorded_at >= start_date,
                MoodEntry.recorded_at <= end_date
            )
        )
    )
    mood_entries = mood_result.scalars().all()
    
    workout_result = await db.execute(
        select(WorkoutSession)
        .where(
            and_(
                WorkoutSession.user_id == user.id,
                WorkoutSession.started_at >= start_date,
                WorkoutSession.started_at <= end_date
            )
        )
    )
    workout_sessions = workout_result.scalars().all()
    
    task_result = await db.execute(
        select(Task)
        .where(
            and_(
                Task.user_id == user.id,
                Task.created_at >= start_date
            )
        )
    )
    tasks = task_result.scalars().all()
    
    # Generate insights
    client = OpenRouterClient(api_key=OPENROUTER_API_KEY)
    agent = WeeklyInsightsAgent(client)
    
    insights = await agent.generate(
        user=user,
        mood_entries=mood_entries,
        workout_sessions=workout_sessions,
        tasks=tasks,
        start_date=start_date,
        end_date=end_date
    )
    
    return insights


# =============================================================================
# Chat Routes
# =============================================================================

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_async_db),
    user: User = Depends(get_current_user)
):
    """
    Chat endpoint with AI assistant.
    Automatically detects mood and can suggest actions.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service not configured"
        )
    
    # Get context
    from sqlalchemy import select
    
    # Recent mood
    mood_result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == user.id)
        .order_by(desc(MoodEntry.recorded_at))
        .limit(3)
    )
    recent_moods = mood_result.scalars().all()
    recent_mood_dict = None
    if recent_moods:
        latest = recent_moods[0]
        recent_mood_dict = {
            "anxiety": latest.anxiety,
            "happiness": latest.happiness,
            "wellness": latest.wellness
        }
    
    # Today's tasks
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tasks_result = await db.execute(
        select(Task)
        .where(
            and_(
                Task.user_id == user.id,
                Task.status.in_(["pending", "in_progress"]),
                (Task.due_date == None) | (Task.due_date >= today_start)
            )
        )
        .limit(5)
    )
    today_tasks = [
        {"title": t.title, "priority": t.priority}
        for t in tasks_result.scalars().all()
    ]
    
    # Recent workout
    workout_result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .order_by(desc(WorkoutSession.started_at))
        .limit(1)
    )
    recent_workout = workout_result.scalar_one_or_none()
    recent_workout_dict = None
    if recent_workout:
        recent_workout_dict = {
            "name": recent_workout.name,
            "duration": recent_workout.duration_minutes,
            "type": recent_workout.workout_type
        }
    
    # Build context
    context = {
        "recent_mood": recent_mood_dict,
        "today_tasks": today_tasks,
        "recent_workout": recent_workout_dict
    }
    
    # Chat
    client = OpenRouterClient(api_key=OPENROUTER_API_KEY)
    agent = ChatAgent(client)
    
    response = await agent.chat(
        user_message=request.message,
        context=context,
        conversation_history=request.conversation_history
    )
    
    # Check if mood detection is triggered
    mood_detected = None
    suggested_action = None
    
    lower_msg = request.message.lower()
    mood_keywords = ["feeling", "mood", "stressed", "tired", "happy", "sad", 
                     "anxious", "excited", "energy", "sleep", "worried"]
    
    if any(kw in lower_msg for kw in mood_keywords):
        # Detect mood from the message
        detector = MoodDetector(api_key=OPENROUTER_API_KEY)
        metrics = await detector.detect(request.message)
        
        # Save mood entry
        mood_entry = MoodEntry(
            user_id=user.id,
            anxiety=metrics.anxiety,
            happiness=metrics.happiness,
            wellness=metrics.wellness,
            sleep=metrics.sleep,
            recovery=metrics.recovery,
            energy=metrics.energy,
            source_text=request.message,
            extra_data={"source": "chat", "confidence": metrics.confidence}
        )
        db.add(mood_entry)
        await db.commit()
        
        mood_detected = {
            "anxiety": metrics.anxiety,
            "happiness": metrics.happiness,
            "wellness": metrics.wellness,
            "sleep": metrics.sleep,
            "recovery": metrics.recovery,
            "energy": metrics.energy
        }
        suggested_action = "mood_logged"
    
    return ChatResponse(
        response=response.content,
        mood_detected=mood_detected,
        suggested_action=suggested_action
    )


# =============================================================================
# Vercel Serverless Handler
# =============================================================================

# For Vercel deployment
handler = app
