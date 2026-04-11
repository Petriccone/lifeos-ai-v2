"""
Seed the exercises table with a curated library of common gym movements.

Idempotent — uses INSERT ... ON CONFLICT DO NOTHING (or an equivalent check)
so re-running is safe.

Run:
    DATABASE_URL=<public-url> python scripts/seed_exercises.py
"""

from __future__ import annotations

import os
import sys
import uuid


EXERCISES: list[dict[str, str]] = [
    # --- Chest (Push) ---
    {"name": "Barbell Bench Press", "muscle_group": "chest", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Incline Dumbbell Press", "muscle_group": "chest", "equipment": "dumbbell", "exercise_type": "compound"},
    {"name": "Decline Bench Press", "muscle_group": "chest", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Dumbbell Fly", "muscle_group": "chest", "equipment": "dumbbell", "exercise_type": "isolation"},
    {"name": "Cable Crossover", "muscle_group": "chest", "equipment": "cable", "exercise_type": "isolation"},
    {"name": "Push-Up", "muscle_group": "chest", "equipment": "bodyweight", "exercise_type": "compound"},
    {"name": "Dips", "muscle_group": "chest", "equipment": "bodyweight", "exercise_type": "compound"},
    # --- Shoulders (Push) ---
    {"name": "Overhead Press", "muscle_group": "shoulders", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Dumbbell Shoulder Press", "muscle_group": "shoulders", "equipment": "dumbbell", "exercise_type": "compound"},
    {"name": "Lateral Raise", "muscle_group": "shoulders", "equipment": "dumbbell", "exercise_type": "isolation"},
    {"name": "Front Raise", "muscle_group": "shoulders", "equipment": "dumbbell", "exercise_type": "isolation"},
    {"name": "Face Pull", "muscle_group": "shoulders", "equipment": "cable", "exercise_type": "isolation"},
    # --- Triceps (Push) ---
    {"name": "Triceps Pushdown", "muscle_group": "triceps", "equipment": "cable", "exercise_type": "isolation"},
    {"name": "Skull Crusher", "muscle_group": "triceps", "equipment": "barbell", "exercise_type": "isolation"},
    {"name": "Overhead Triceps Extension", "muscle_group": "triceps", "equipment": "dumbbell", "exercise_type": "isolation"},
    # --- Back (Pull) ---
    {"name": "Deadlift", "muscle_group": "back", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Pull-Up", "muscle_group": "back", "equipment": "bodyweight", "exercise_type": "compound"},
    {"name": "Chin-Up", "muscle_group": "back", "equipment": "bodyweight", "exercise_type": "compound"},
    {"name": "Lat Pulldown", "muscle_group": "back", "equipment": "cable", "exercise_type": "compound"},
    {"name": "Barbell Row", "muscle_group": "back", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Seated Cable Row", "muscle_group": "back", "equipment": "cable", "exercise_type": "compound"},
    {"name": "T-Bar Row", "muscle_group": "back", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "One-Arm Dumbbell Row", "muscle_group": "back", "equipment": "dumbbell", "exercise_type": "compound"},
    # --- Biceps (Pull) ---
    {"name": "Barbell Curl", "muscle_group": "biceps", "equipment": "barbell", "exercise_type": "isolation"},
    {"name": "Dumbbell Curl", "muscle_group": "biceps", "equipment": "dumbbell", "exercise_type": "isolation"},
    {"name": "Hammer Curl", "muscle_group": "biceps", "equipment": "dumbbell", "exercise_type": "isolation"},
    {"name": "Preacher Curl", "muscle_group": "biceps", "equipment": "machine", "exercise_type": "isolation"},
    # --- Legs ---
    {"name": "Back Squat", "muscle_group": "quadriceps", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Front Squat", "muscle_group": "quadriceps", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Romanian Deadlift", "muscle_group": "hamstrings", "equipment": "barbell", "exercise_type": "compound"},
    {"name": "Bulgarian Split Squat", "muscle_group": "quadriceps", "equipment": "dumbbell", "exercise_type": "compound"},
    {"name": "Leg Press", "muscle_group": "quadriceps", "equipment": "machine", "exercise_type": "compound"},
    {"name": "Leg Extension", "muscle_group": "quadriceps", "equipment": "machine", "exercise_type": "isolation"},
    {"name": "Leg Curl", "muscle_group": "hamstrings", "equipment": "machine", "exercise_type": "isolation"},
    {"name": "Walking Lunge", "muscle_group": "quadriceps", "equipment": "dumbbell", "exercise_type": "compound"},
    {"name": "Standing Calf Raise", "muscle_group": "calves", "equipment": "machine", "exercise_type": "isolation"},
    {"name": "Hip Thrust", "muscle_group": "glutes", "equipment": "barbell", "exercise_type": "compound"},
    # --- Core ---
    {"name": "Plank", "muscle_group": "core", "equipment": "bodyweight", "exercise_type": "isolation"},
    {"name": "Hanging Leg Raise", "muscle_group": "core", "equipment": "bodyweight", "exercise_type": "isolation"},
    {"name": "Cable Crunch", "muscle_group": "core", "equipment": "cable", "exercise_type": "isolation"},
    {"name": "Russian Twist", "muscle_group": "core", "equipment": "bodyweight", "exercise_type": "isolation"},
    # --- Cardio ---
    {"name": "Running", "muscle_group": "cardio", "equipment": "bodyweight", "exercise_type": "cardio"},
    {"name": "Cycling", "muscle_group": "cardio", "equipment": "machine", "exercise_type": "cardio"},
    {"name": "Rowing", "muscle_group": "cardio", "equipment": "machine", "exercise_type": "cardio"},
    {"name": "Jump Rope", "muscle_group": "cardio", "equipment": "bodyweight", "exercise_type": "cardio"},
    {"name": "Stair Climber", "muscle_group": "cardio", "equipment": "machine", "exercise_type": "cardio"},
]


def main() -> int:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        print("ERROR: DATABASE_URL is not set", file=sys.stderr)
        return 1

    # Normalize to sync driver
    if database_url.startswith("postgresql+asyncpg://"):
        sync_url = database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif database_url.startswith("postgresql://"):
        sync_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        sync_url = database_url

    from sqlalchemy import create_engine, text

    engine = create_engine(sync_url)
    print(f"Seeding exercises against: {sync_url.split('@')[-1]}")

    inserted = 0
    skipped = 0
    with engine.begin() as conn:
        # Build a set of existing names to make this idempotent.
        existing = {
            row[0]
            for row in conn.execute(text("SELECT name FROM exercises"))
        }
        for ex in EXERCISES:
            if ex["name"] in existing:
                skipped += 1
                continue
            conn.execute(
                text(
                    "INSERT INTO exercises (id, name, muscle_group, equipment, exercise_type, created_at) "
                    "VALUES (:id, :name, :mg, :eq, :et, NOW())"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "name": ex["name"],
                    "mg": ex["muscle_group"],
                    "eq": ex["equipment"],
                    "et": ex["exercise_type"],
                },
            )
            inserted += 1

    print(f"Inserted: {inserted}  Skipped (already present): {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
