"""
One-shot migration: add `password_hash` column to the `users` table.

Idempotent — safe to run multiple times. Uses `DATABASE_URL` from the
environment (the same variable the app uses). Intended to be run once on
Railway Postgres via:

    railway run python scripts/migrate_password_hash.py
"""

from __future__ import annotations

import os
import sys


def main() -> int:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        print("ERROR: DATABASE_URL is not set", file=sys.stderr)
        return 1

    # Normalize to a sync driver for a one-shot DDL
    if database_url.startswith("postgresql+asyncpg://"):
        sync_url = database_url.replace(
            "postgresql+asyncpg://", "postgresql+psycopg2://", 1
        )
    elif database_url.startswith("postgresql://"):
        sync_url = database_url.replace(
            "postgresql://", "postgresql+psycopg2://", 1
        )
    else:
        sync_url = database_url

    from sqlalchemy import create_engine, text

    engine = create_engine(sync_url)
    ddl = text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"
    )

    print(f"Running migration against: {sync_url.split('@')[-1]}")
    with engine.begin() as conn:
        conn.execute(ddl)

    print("OK: users.password_hash column is present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
