"""
LifeOS AI - Database Models
SQLAlchemy models for PostgreSQL + pgvector on Supabase
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean,
    ForeignKey, Text, JSON, Enum as SQLEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB, ARRAY as PG_ARRAY
import uuid
import enum


def _new_uuid() -> str:
    return str(uuid.uuid4())


Base = declarative_base()

# Cross-DB compatible types: Postgres uses native UUID/JSONB/ARRAY,
# SQLite falls back to String(36)/JSON for portability.
UUID = PG_UUID(as_uuid=True).with_variant(String(36), "sqlite")
JSONB = PG_JSONB().with_variant(JSON(), "sqlite")
# ARRAY has no SQLite equivalent — use JSON as fallback
ARRAY_FLOAT = PG_ARRAY(Float).with_variant(JSON(), "sqlite")
ARRAY_STRING = PG_ARRAY(String).with_variant(JSON(), "sqlite")


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    supabase_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mood_entries = relationship("MoodEntry", back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    daily_briefs = relationship("DailyBrief", back_populates="user", cascade="all, delete-orphan")
    health_metrics = relationship("HealthMetric", back_populates="user", cascade="all, delete-orphan")


class MoodEntry(Base):
    __tablename__ = "mood_entries"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    
    # Mood metrics (0-100 scale, anxiety inverted)
    anxiety: Mapped[float] = mapped_column(Float, nullable=False)  # Lower is better
    happiness: Mapped[float] = mapped_column(Float, nullable=False)
    wellness: Mapped[float] = mapped_column(Float, nullable=False)
    sleep: Mapped[float] = mapped_column(Float, nullable=False)
    recovery: Mapped[float] = mapped_column(Float, nullable=False)
    energy: Mapped[float] = mapped_column(Float, nullable=True)
    
    # Source data
    source_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # AI embedding for similarity search (pgvector)
    embedding: Mapped[Optional[List[float]]] = mapped_column(ARRAY_FLOAT, nullable=True)
    
    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="mood_entries")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Workout type and summary
    workout_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # strength, cardio, hiit, etc.
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Summary metrics
    total_volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # kg * reps
    calories_burned: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    average_heart_rate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="workout_sessions")
    exercises = relationship("WorkoutExercise", back_populates="session", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    muscle_group: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    equipment: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    exercise_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # compound, isolation, cardio
    
    # AI embedding for exercise similarity
    embedding: Mapped[Optional[List[float]]] = mapped_column(ARRAY_FLOAT, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workout_exercises = relationship("WorkoutExercise", back_populates="exercise")


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    session_id: Mapped[str] = mapped_column(UUID, ForeignKey("workout_sessions.id"), nullable=False, index=True)
    exercise_id: Mapped[str] = mapped_column(UUID, ForeignKey("exercises.id"), nullable=False)
    
    order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Sets data stored as JSON for flexibility
    sets: Mapped[Optional[List[dict]]] = mapped_column(
        JSONB, 
        nullable=True,
        default=list  # [{"reps": 10, "weight": 50, "duration": null}, ...]
    )
    
    # Summary
    total_volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("WorkoutSession", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="workout_exercises")


class Task(Base):
    __tablename__ = "tasks"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default=TaskStatus.PENDING.value, index=True)
    priority: Mapped[str] = mapped_column(String(20), default=TaskPriority.MEDIUM.value)
    
    # Category for LifeOS metrics
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # mental, physical, work, social, financial
    
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Extra data
    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tasks")


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    metric_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    extra_data: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="health_metrics")


class DailyBrief(Base):
    __tablename__ = "daily_briefs"
    
    id: Mapped[str] = mapped_column(UUID, primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    
    # Brief content
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    mood_insight: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    workout_insight: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    task_insight: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metrics snapshot
    metrics_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Recommendations
    recommendations: Mapped[Optional[List[str]]] = mapped_column(ARRAY_STRING, nullable=True)
    
    # AI model used
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="daily_briefs")


# Pydantic schemas for API (optional, for type hinting)
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime as dt


class MoodEntryCreate(BaseModel):
    anxiety: float = Field(..., ge=0, le=100)
    happiness: float = Field(..., ge=0, le=100)
    wellness: float = Field(..., ge=0, le=100)
    sleep: float = Field(..., ge=0, le=100)
    recovery: float = Field(..., ge=0, le=100)
    energy: Optional[float] = Field(None, ge=0, le=100)
    source_text: Optional[str] = None


class MoodEntryResponse(MoodEntryCreate):
    id: UUID
    user_id: UUID
    recorded_at: datetime
    
    class Config:
        from_attributes = True


class WorkoutSessionCreate(BaseModel):
    name: Optional[str] = None
    workout_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    exercises: Optional[List[dict]] = []


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    category: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[datetime] = None


class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str
    timestamp: Optional[datetime] = None
