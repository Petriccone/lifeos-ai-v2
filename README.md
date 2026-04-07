# LifeOS AI 🧠

**Your Personal Life Operating System** — AI-powered mood tracking, workout logging, and smart daily insights.

![LifeOS AI](https://via.placeholder.com/800x400/0a0a0f/8b5cf6?text=LifeOS+AI)

## Features

- **🎭 Mood Tracking via AI** — Conversa com a IA e ela detecta automaticamente seu humor
- **💪 Workout Logging** — Log de treinos com exercícios, séries, reps e peso
- **✅ Task Management** — Tarefas com prioridade e categorias
- **📊 Health Dashboard** — Health Score, métricas de bem-estar, gráficos de progresso
- **🧠 AI Daily Brief** — Briefing matinal personalizado
- **📈 Weekly Insights** — Comparativo semanal com insights acionáveis

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + React + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) + Supabase |
| Database | PostgreSQL + pgvector |
| AI | Claude via OpenRouter |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account (or local PostgreSQL)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp ../.env.example .env
# Edit .env with your credentials

# Run development server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

```env
# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_jwt_secret
```

## Project Structure

```
lifeos/
├── SPEC.md                 # Full product specification
├── README.md               # This file
├── backend/
│   ├── main.py            # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── README.md          # Backend docs
└── frontend/
    ├── app/
    │   ├── page.tsx       # Main dashboard
    │   ├── workouts/      # Workout tracking page
    │   └── chat/          # AI chat page
    ├── components/        # React components
    ├── package.json
    ├── tailwind.config.js
    └── README.md          # Frontend docs
```

## Database Schema

Key tables:
- `users` — User accounts
- `mood_entries` — Mood logs with AI-detected metrics
- `workout_sessions` — Workout sessions
- `workout_exercises` — Exercises within sessions
- `tasks` — Tasks with priority and categories
- `daily_briefs` — AI-generated daily briefings

See `SPEC.md` for complete schema.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mood` | Log mood entry |
| GET | `/mood` | Get mood history |
| POST | `/workouts` | Create workout |
| GET | `/workouts` | List workouts |
| POST | `/tasks` | Create task |
| GET | `/tasks` | List tasks |
| POST | `/chat` | AI chat |
| GET | `/brief/today` | Daily brief |
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |

## Roadmap

- [ ] Push notifications
- [ ] Apple Health / Google Fit integration
- [ ] Widget for quick mood check-in
- [ ] Data export
- [ ] Multi-language support

## License

MIT

---

Built with ❤️ for personal productivity
