# LifeOS AI - Backend

FastAPI-powered API for the LifeOS AI personal life management system.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Mood
- `POST /mood` - Log mood (with AI analysis)
- `GET /mood` - Get mood history

### Workouts
- `POST /workouts` - Create workout
- `GET /workouts` - List workouts
- `GET /workouts/{id}` - Get specific workout

### Exercises
- `POST /exercises` - Add exercise
- `GET /exercises` - List exercises

### Tasks
- `POST /tasks` - Create task
- `GET /tasks` - List tasks
- `PUT /tasks/{id}` - Update task

### AI
- `POST /chat` - AI chat
- `GET /brief/today` - Daily brief
