# LifeOS AI — Product Specification

## Vision

LifeOS AI is your personal "Life Operating System" — an AI-powered app that understands your mood, tracks your workouts, manages your tasks, and helps you live better. Think of it as a human OS with AI that actually gets you.

**Core Promise**: "Stop managing your life manually. Let AI understand how you feel and what you need."

---

## Design Language

### Aesthetic: Dark Neon Dashboard
Inspired by Lifelink AI — premium dark mode with vibrant neon accents.

**Colors**:
- Background: `#0a0a0f` (deep black)
- Card BG: `#1a1a2e` (dark navy)
- Primary: `#8b5cf6` (purple)
- Success: `#10b981` (green)
- Warning: `#f97316` (orange)
- Danger: `#ef4444` (red)
- Info: `#3b82f6` (blue)

**Typography**: Inter (headings) + system fonts (body)

**UI Elements**:
- Circular gauges with gradient strokes
- Rounded cards (16px radius)
- Soft shadows and glows
- Smooth animations

---

## Database Schema (PostgreSQL + pgvector)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mood entries (RAG-enabled)
CREATE TABLE mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  mood_score INTEGER CHECK (mood_score >= 0 AND mood_score <= 100),
  anxiety REAL CHECK (anxiety >= 0 AND anxiety <= 1),
  happiness REAL CHECK (happiness >= 0 AND happiness <= 1),
  wellness REAL CHECK (wellness >= 0 AND wellness <= 1),
  sleep REAL CHECK (sleep >= 0 AND sleep <= 1),
  recovery REAL CHECK (recovery >= 0 AND recovery <= 1),
  notes TEXT,
  conversation_text TEXT, -- raw conversation for RAG
  embedding VECTOR(1536), -- pgvector for semantic search
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  muscle_group TEXT NOT NULL, -- chest, back, legs, shoulders, arms, core
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  duration_minutes INTEGER,
  workout_type TEXT, -- push, pull, legs, cardio, custom
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout exercises (junction table)
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  sets INTEGER,
  reps INTEGER,
  weight_kg REAL,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  category TEXT, -- mental, physical, work, social
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily briefs (AI-generated)
CREATE TABLE daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE UNIQUE NOT NULL,
  mood_summary TEXT,
  health_score INTEGER,
  recommended_tasks TEXT[], -- array of task IDs
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for semantic search
CREATE INDEX mood_embedding_idx ON mood_entries USING ivfflat (embedding vector_cosine_ops);
```

---

## API Endpoints (FastAPI)

### Mood
- `POST /mood` — Log new mood entry (with AI analysis)
- `GET /mood` — Get mood history (with date filters)
- `GET /mood/today` — Get today's mood

### Workouts
- `POST /workouts` — Create workout session
- `GET /workouts` — List workouts (with date range filter)
- `GET /workouts/{id}` — Get specific workout
- `PUT /workouts/{id}` — Update workout
- `DELETE /workouts/{id}` — Delete workout

### Exercises
- `GET /exercises` — List all exercises
- `POST /exercises` — Add new exercise
- `GET /exercises/{id}` — Get exercise details

### Tasks
- `POST /tasks` — Create task
- `GET /tasks` — List tasks (filter by status, category)
- `PUT /tasks/{id}` — Update task
- `DELETE /tasks/{id}` — Delete task

### AI Features
- `POST /chat` — AI chat (detects mood from conversation)
- `GET /brief/today` — Get today's daily brief
- `GET /insights/weekly` — Get weekly insights report
- `GET /insights/correlation` — Mood-Workout correlation analysis

### Auth
- `POST /auth/register` — Create account
- `POST /auth/login` — Login
- `GET /auth/me` — Get current user

---

## AI Agent System Prompts

### MoodDetector
System prompt for analyzing conversation and extracting mood:
```
You are MoodDetector, an AI that analyzes text conversations and extracts mood metrics.

Analyze the user's message and extract:
- anxiety: 0.0 to 1.0 (0 = no anxiety, 1 = extreme anxiety)
- happiness: 0.0 to 1.0 (0 = sad, 1 = very happy)
- wellness: 0.0 to 1.0 (overall wellbeing)
- sleep: 0.0 to 1.0 (0 = exhausted, 1 = well-rested)
- recovery: 0.0 to 1.0 (physical recovery level)

Respond ONLY with valid JSON:
{"anxiety": 0.0, "happiness": 0.0, "wellness": 0.0, "sleep": 0.0, "recovery": 0.0}
```

### DailyBriefGenerator
System prompt for morning briefing:
```
You are DailyBriefGenerator, an AI that creates personalized morning briefings.

Based on the user's recent mood history, today's date, and pending tasks:
1. Summarize how they've been feeling
2. Give an overall health score (0-100)
3. Recommend 3 most important tasks for today (based on mood + priority)
4. Provide 1-2 actionable insights

Keep it conversational, encouraging, and actionable.
```

### WeeklyInsights
System prompt for weekly report:
```
You are WeeklyInsights, an AI that generates weekly life reports.

Compare this week's data to last week:
- Average mood scores
- Workout completion
- Task completion rate
- Key patterns or correlations

Format as an engaging report with:
1. Week summary headline
2. Metrics comparison (this week vs last week)
3. Top 3 insights
4. Recommendations for next week
```

---

## Technical Decisions

1. **Supabase over raw PostgreSQL**: Built-in auth, real-time subscriptions, pgvector support
2. **FastAPI on Vercel**: Serverless = cheap + scalable
3. **RAG via pgvector**: Store mood conversations as embeddings for semantic search
4. **Next.js 14 App Router**: Server components, easy deployment
5. **Tailwind + Radix UI**: Fast styling, accessible components
6. **OpenRouter for AI**: Single API for multiple providers (Claude, GPT, etc)

---

## Roadmap

### Phase 1: Core (MVP)
- [x] Database schema
- [x] FastAPI backend
- [x] Mood tracking + AI detection
- [x] Workout logging
- [x] Basic dashboard UI

### Phase 2: Intelligence
- [ ] Daily brief generation
- [ ] Weekly insights
- [ ] Mood-Workout correlation
- [ ] Task prioritization AI

### Phase 3: Polish
- [ ] Push notifications
- [ ] Apple Health / Google Fit integration
- [ ] Widget for quick mood check-in
- [ ] Export data
