"""
LifeOS AI - AI Agents
AI agent functions using OpenRouter + Claude
"""

import os
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
import httpx

from models import (
    User, MoodEntry, WorkoutSession, Task, DailyBrief,
    MoodEntryCreate, WorkoutSessionCreate, TaskCreate
)


# Configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "anthropic/claude-sonnet-4"


@dataclass
class AIResponse:
    """Standardized AI response"""
    content: str
    model: str
    tokens_used: Optional[int] = None
    raw: Optional[Dict] = None


class OpenRouterClient:
    """HTTP client for OpenRouter API"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenRouter API key required. Set OPENROUTER_API_KEY env var.")
        self.model = model or DEFAULT_MODEL
    
    async def chat(
        self, 
        messages: List[Dict[str, str]], 
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> AIResponse:
        """
        Send chat completion request to OpenRouter.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            system: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Max tokens to generate
            
        Returns:
            AIResponse object
        """
        # Prepend system prompt if provided
        if system:
            messages = [{"role": "system", "content": system}] + messages
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lifeos.ai",
            "X-Title": "LifeOS AI"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            choice = data.get("choices", [{}])[0]
            content = choice.get("message", {}).get("content", "")
            usage = data.get("usage", {})
            
            return AIResponse(
                content=content,
                model=self.model,
                tokens_used=usage.get("total_tokens"),
                raw=data
            )


class MoodDetectorAgent:
    """
    AI Agent for mood detection from conversational text.
    Wraps the mood_detector.py functionality with agentic patterns.
    """
    
    def __init__(self, client: OpenRouterClient):
        self.client = client
        self.system_prompt = """You are a compassionate wellness companion. You help users 
track their mental health by detecting mood patterns from conversation. Be empathetic, 
non-judgmental, and clinically informed but conversational. Never diagnose - you track patterns."""
    
    async def analyze(
        self, 
        text: str, 
        conversation_history: Optional[List[Dict]] = None,
        previous_moods: Optional[List[MoodEntry]] = None
    ) -> Dict[str, Any]:
        """
        Analyze mood from text with contextual awareness.
        
        Args:
            text: Current user message
            conversation_history: Previous messages
            previous_moods: Recent mood entries for trend awareness
            
        Returns:
            Dict with mood_metrics and insight
        """
        # Build context
        context = ""
        if previous_moods:
            recent = previous_moods[:3]
            trend_info = []
            for mood in recent:
                trend_info.append(
                    f"- {mood.recorded_at.strftime('%b %d')}: "
                    f"anxiety={mood.anxiety:.0f}, happiness={mood.happiness:.0f}"
                )
            context = f"\n\nRecent mood history:\n" + "\n".join(trend_info)
        
        messages = [
            {"role": "user", "content": f"Analyze this message for mood:\n\n{text}{context}"}
        ]
        
        response = await self.client.chat(
            messages,
            system=self.system_prompt,
            temperature=0.3
        )
        
        return {
            "raw_insight": response.content,
            "model": response.model
        }


class DailyBriefGeneratorAgent:
    """
    AI Agent that generates personalized daily briefings.
    """
    
    def __init__(self, client: OpenRouterClient):
        self.client = client
    
    async def generate(
        self,
        user: User,
        mood_entries: List[MoodEntry],
        workout_sessions: List[WorkoutSession],
        tasks: List[Task],
        date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive daily brief.
        
        Args:
            user: User object
            mood_entries: Today's mood entries
            workout_sessions: Recent workout sessions
            tasks: Today's and upcoming tasks
            date: Date for the brief
            
        Returns:
            Dict with brief sections
        """
        target_date = date or datetime.utcnow()
        
        # Compile data summary
        mood_data = self._summarize_moods(mood_entries)
        workout_data = self._summarize_workouts(workout_sessions)
        task_data = self._summarize_tasks(tasks)
        
        system_prompt = """You are a personal lifeOS assistant generating a daily briefing.
Create a concise, motivating briefing that covers:
1. Overall mood summary and trend
2. Any notable emotional patterns
3. Workout progress and encouragement
4. Task priorities for the day
5. One actionable tip based on the data

Be warm, supportive, and specific. Use the data provided.
Keep it to 3-4 short paragraphs maximum."""
        
        user_content = f"""Generate today's daily brief for {user.name or 'User'}.

Date: {target_date.strftime('%A, %B %d, %Y')}

MOOD DATA:
{mood_data}

WORKOUT DATA:
{workout_data}

TASKS:
{task_data}

Generate the briefing now."""

        response = await self.client.chat(
            [{"role": "user", "content": user_content}],
            system=system_prompt,
            temperature=0.7,
            max_tokens=800
        )
        
        # Parse into structured sections
        brief = self._structure_brief(response.content)
        
        return {
            "summary": brief.get("summary", response.content),
            "mood_insight": brief.get("mood_insight"),
            "workout_insight": brief.get("workout_insight"),
            "task_insight": brief.get("task_insight"),
            "recommendations": brief.get("recommendations", []),
            "metrics_snapshot": {
                "avg_mood": mood_data,
                "workout_summary": workout_data,
                "task_summary": task_data
            },
            "model": response.model,
            "date": target_date.isoformat()
        }
    
    def _summarize_moods(self, entries: List[MoodEntry]) -> str:
        if not entries:
            return "No mood data recorded yet."
        
        avg_anxiety = sum(e.anxiety for e in entries) / len(entries)
        avg_happiness = sum(e.happiness for e in entries) / len(entries)
        avg_wellness = sum(e.wellness for e in entries) / len(entries)
        avg_sleep = sum(e.sleep for e in entries) / len(entries)
        avg_recovery = sum(e.recovery for e in entries) / len(entries)
        
        return f"""Averaged from {len(entries)} entries:
- Anxiety: {avg_anxiety:.1f}/100 (lower is better)
- Happiness: {avg_happiness:.1f}/100
- Wellness: {avg_wellness:.1f}/100
- Sleep: {avg_sleep:.1f}/100
- Recovery: {avg_recovery:.1f}/100"""
    
    def _summarize_workouts(self, sessions: List[WorkoutSession]) -> str:
        if not sessions:
            return "No workouts recorded yet this week."
        
        total_duration = sum((s.duration_minutes or 0) for s in sessions)
        total_calories = sum((s.calories_burned or 0) for s in sessions)
        
        workout_types = {}
        for s in sessions:
            wt = s.workout_type or "mixed"
            workout_types[wt] = workout_types.get(wt, 0) + 1
        
        types_str = ", ".join([f"{k}({v})" for k, v in workout_types.items()])
        
        return f"""This week: {len(sessions)} workouts, {total_duration} minutes total, ~{total_calories} calories burned.
Types: {types_str}"""
    
    def _summarize_tasks(self, tasks: List[Task]) -> str:
        pending = [t for t in tasks if t.status in ("pending", "in_progress")]
        high_priority = [t for t in pending if t.priority in ("high", "urgent")]
        
        if not pending:
            return "All tasks completed! 🎉"
        
        lines = [f"{len(pending)} pending tasks, {len(high_priority)} high priority:"]
        for t in high_priority[:5]:
            lines.append(f"- [{t.priority.upper()}] {t.title}")
        
        return "\n".join(lines)
    
    def _structure_brief(self, content: str) -> Dict[str, Any]:
        """Try to parse structured sections from the brief text."""
        # Simple parsing - in production this would be more sophisticated
        return {
            "summary": content,
            "mood_insight": None,
            "workout_insight": None,
            "task_insight": None,
            "recommendations": []
        }


class WeeklyInsightsAgent:
    """
    AI Agent that generates weekly insights and trends.
    """
    
    def __init__(self, client: OpenRouterClient):
        self.client = client
    
    async def generate(
        self,
        user: User,
        mood_entries: List[MoodEntry],
        workout_sessions: List[WorkoutSession],
        tasks: List[Task],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Generate weekly insights and trends.
        
        Args:
            user: User object
            mood_entries: Week's mood entries
            workout_sessions: Week's workout sessions
            tasks: Week's tasks
            start_date: Week start
            end_date: Week end
            
        Returns:
            Dict with insights and trends
        """
        system_prompt = """You are a data-driven wellness analyst. Analyze the week's data 
and provide:
1. Key trends (improving/declining metrics)
2. Patterns and correlations you notice
3. Personalized recommendations for next week
4. Wins and positives to acknowledge

Be specific with numbers. Be encouraging but honest. 4-5 paragraphs max."""
        
        # Build data summary
        days_in_week = (end_date - start_date).days + 1
        
        mood_by_day = {}
        for entry in mood_entries:
            day = entry.recorded_at.strftime("%A")
            if day not in mood_by_day:
                mood_by_day[day] = []
            mood_by_day[day].append(entry)
        
        mood_summary = self._weekly_mood_summary(mood_by_day)
        workout_summary = self._weekly_workout_summary(workout_sessions)
        task_summary = self._weekly_task_summary(tasks)
        
        user_content = f"""Weekly insights report for {user.name or 'User'}

Week: {start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}

MOOD TRENDS:
{mood_summary}

WORKOUT SUMMARY:
{workout_summary}

TASK COMPLETION:
{task_summary}

Generate insights now."""

        response = await self.client.chat(
            [{"role": "user", "content": user_content}],
            system=system_prompt,
            temperature=0.7,
            max_tokens=1000
        )
        
        return {
            "insights": response.content,
            "week_start": start_date.isoformat(),
            "week_end": end_date.isoformat(),
            "mood_trends": self._extract_mood_trends(mood_entries),
            "workout_stats": self._workout_stats(workout_sessions),
            "task_stats": self._task_stats(tasks),
            "model": response.model
        }
    
    def _weekly_mood_summary(self, mood_by_day: Dict) -> str:
        if not mood_by_day:
            return "No mood data recorded this week."
        
        lines = []
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
            if day in mood_by_day:
                entries = mood_by_day[day]
                avg = {
                    "anxiety": sum(e.anxiety for e in entries) / len(entries),
                    "happiness": sum(e.happiness for e in entries) / len(entries)
                }
                lines.append(f"{day}: anxiety={avg['anxiety']:.0f}, happiness={avg['happiness']:.0f}")
        
        return "\n".join(lines) if lines else "No mood data this week."
    
    def _weekly_workout_summary(self, sessions: List[WorkoutSession]) -> str:
        if not sessions:
            return "No workouts this week."
        
        total_mins = sum((s.duration_minutes or 0) for s in sessions)
        total_cal = sum((s.calories_burned or 0) for s in sessions)
        
        return f"{len(sessions)} sessions, {total_mins} minutes, {total_cal} cal burned"
    
    def _weekly_task_summary(self, tasks: List[Task]) -> str:
        completed = [t for t in tasks if t.status == "completed"]
        total = len(tasks)
        rate = (len(completed) / total * 100) if total > 0 else 0
        
        return f"{len(completed)}/{total} tasks completed ({rate:.0f}%)"
    
    def _extract_mood_trends(self, entries: List[MoodEntry]) -> Dict[str, Any]:
        if len(entries) < 2:
            return {"trend": "insufficient_data"}
        
        # Simple trend: compare first half to second half
        mid = len(entries) // 2
        first_half = entries[:mid]
        second_half = entries[mid:]
        
        def avg(items, field):
            return sum(getattr(e, field) for e in items) / len(items)
        
        trends = {}
        for metric in ["anxiety", "happiness", "wellness", "sleep", "recovery"]:
            first_avg = avg(first_half, metric)
            second_avg = avg(second_half, metric)
            diff = second_avg - first_avg
            trends[metric] = {
                "change": diff,
                "direction": "improving" if diff > 5 else ("declining" if diff < -5 else "stable")
            }
        
        return trends
    
    def _workout_stats(self, sessions: List[WorkoutSession]) -> Dict:
        if not sessions:
            return {"total": 0, "minutes": 0, "calories": 0}
        
        return {
            "total": len(sessions),
            "minutes": sum((s.duration_minutes or 0) for s in sessions),
            "calories": sum((s.calories_burned or 0) for s in sessions)
        }
    
    def _task_stats(self, tasks: List[Task]) -> Dict:
        if not tasks:
            return {"total": 0, "completed": 0, "rate": 0}
        
        completed = [t for t in tasks if t.status == "completed"]
        return {
            "total": len(tasks),
            "completed": len(completed),
            "rate": len(completed) / len(tasks) * 100
        }


class WorkoutIntentExtractor:
    """
    Extracts structured workout parameters from natural language chat messages.
    Uses a fast model to convert "monta um treino de peito, 45 min" into
    structured AiWorkoutRequest-compatible params.
    """

    # Multi-word phrases that are unambiguous workout creation intent
    EXPLICIT_PHRASES = [
        "montar treino", "monta um treino", "monte um treino",
        "cria um treino", "crie um treino",
        "gera um treino", "gere um treino",
        "prepara um treino", "faz um treino",
        "create a workout", "generate a workout", "build a workout",
        "make me a workout", "plan a workout",
        "quero treinar", "preciso de um treino",
        "bora treinar", "vamos treinar",
    ]

    # Nouns that indicate workout context
    WORKOUT_NOUNS = [
        "treino", "workout", "exercicio", "academia",
        "training session", "gym session",
    ]

    # Verbs that indicate creation intent (only matched WITH a workout noun)
    CREATION_VERBS = [
        "monta", "monte", "cria", "crie", "gera", "gere", "prepara",
        "prepare", "faz", "faca", "create", "generate", "build", "make",
        "plan", "design", "quero", "preciso", "need", "want",
    ]

    def __init__(self, client: OpenRouterClient):
        self.client = client

    @staticmethod
    def has_workout_intent(message: str) -> bool:
        """Check if the message expresses explicit intent to create a workout.
        Requires either an explicit multi-word phrase OR a creation verb + workout noun."""
        lower = message.lower()

        # Check explicit multi-word phrases first (high confidence)
        for phrase in WorkoutIntentExtractor.EXPLICIT_PHRASES:
            if phrase in lower:
                return True

        # Require BOTH a workout noun AND a creation verb (prevents false positives)
        has_noun = any(n in lower for n in WorkoutIntentExtractor.WORKOUT_NOUNS)
        has_verb = any(v in lower for v in WorkoutIntentExtractor.CREATION_VERBS)
        return has_noun and has_verb

    async def extract_params(self, message: str) -> Optional[Dict[str, Any]]:
        """
        Extract workout parameters from a natural language message.
        Returns a dict compatible with AiWorkoutRequest fields, or None on failure.
        """
        system_prompt = """You extract workout parameters from natural language messages.
Return ONLY valid JSON with these fields (use defaults when not specified):
{
  "goal": "hypertrophy",        // strength | hypertrophy | fat_loss | endurance
  "level": "intermediate",      // beginner | intermediate | advanced
  "duration_minutes": 60,       // 10-180
  "workout_type": "push",       // push | pull | legs | full_body | cardio | upper | lower
  "equipment": ["barbell", "dumbbell", "machine", "bodyweight", "cable"],
  "notes": null                 // any extra context from the user
}

Mapping hints for workout_type:
- peito/chest/ombro/shoulder/triceps → "push"
- costas/back/biceps → "pull"
- perna/legs/gluteo/quadriceps → "legs"
- corpo inteiro/full body → "full_body"
- cardio/corrida/running/hiit → "cardio"
- superior/upper → "upper"
- inferior/lower → "lower"

Return ONLY the JSON object. No explanation."""

        response = await self.client.chat(
            messages=[{"role": "user", "content": message}],
            system=system_prompt,
            temperature=0.1,
            max_tokens=300,
        )

        raw = response.content.strip()
        first_brace = raw.find("{")
        last_brace = raw.rfind("}")
        if first_brace >= 0 and last_brace > first_brace:
            raw = raw[first_brace : last_brace + 1]

        try:
            return json.loads(raw)
        except (json.JSONDecodeError, Exception):
            return None


class ChatAgent:
    """
    General conversational AI agent for the chat interface.
    """
    
    def __init__(self, client: OpenRouterClient):
        self.client = client
        self.system_prompt = """You are LifeOS AI, a personal life management companion.
You're helpful, warm, slightly witty, and focused on helping users track their wellness,
productivity, and personal growth. You have access to their mood data, workouts, and tasks.

You can:
- Check in on their mood and log mood entries
- Generate personalized workout plans when asked (the system will automatically create and save the workout)
- Provide workout motivation and track progress
- Help manage tasks and priorities
- Generate daily briefings and weekly insights
- Have genuine, supportive conversations

When a user asks you to create/build/generate a workout, respond enthusiastically and mention
that the workout has been created and saved. Describe the workout briefly in your response.
The system handles the actual generation — just acknowledge it naturally.

Always reply in the same language the user writes in (e.g., Portuguese if they write in Portuguese).
When describing a generated workout, briefly mention the key exercises and encourage the user.
Be conversational, not clinical. Show genuine interest. Keep responses concise.
When appropriate, suggest actions they might want to take (logging mood, checking brief, etc.)"""
    
    async def chat(
        self,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> AIResponse:
        """
        Process a chat message and return a response.
        
        Args:
            user_message: The user's message
            context: Optional context (recent mood, tasks, etc.)
            conversation_history: Previous conversation turns
            
        Returns:
            AIResponse with the assistant's reply
        """
        messages = conversation_history or []
        
        # Add context if provided
        if context:
            context_str = self._format_context(context)
            if context_str:
                messages.append({
                    "role": "system",
                    "content": f"Current context:\n{context_str}"
                })
        
        messages.append({"role": "user", "content": user_message})
        
        return await self.client.chat(
            messages,
            system=self.system_prompt,
            temperature=0.8,
            max_tokens=500
        )
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context data into a readable string."""
        parts = []

        m = context.get("recent_mood") or {}
        if m:
            parts.append(f"Recent mood: anxiety={m.get('anxiety', '?')}, happiness={m.get('happiness', '?')}")

        tasks = context.get("today_tasks") or []
        if tasks:
            task_list = ", ".join([str(t.get('title', '')) for t in tasks[:3]])
            parts.append(f"Today's tasks: {task_list}")

        w = context.get("recent_workout") or {}
        if w:
            parts.append(f"Last workout: {w.get('name', 'Session')} - {w.get('duration', '?')} min")

        # Detected mood from the current message (pre-chat)
        dm = context.get("detected_mood") or {}
        if dm:
            parts.append(
                f"[MOOD JUST DETECTED from this message] "
                f"anxiety={dm.get('anxiety', '?')}, happiness={dm.get('happiness', '?')}, "
                f"wellness={dm.get('wellness', '?')}, energy={dm.get('energy', '?')} "
                f"— Acknowledge the user's emotional state naturally."
            )

        # Workout just generated from the current message (pre-chat)
        gw = context.get("just_generated_workout") or {}
        if gw:
            ex_names = ", ".join(e.get("name", "") for e in (gw.get("exercises") or []))
            parts.append(
                f"[WORKOUT JUST GENERATED and saved] "
                f"name=\"{gw.get('name', '?')}\", type={gw.get('workout_type', '?')}, "
                f"duration={gw.get('duration_minutes', '?')} min, "
                f"{gw.get('num_exercises', '?')} exercises: {ex_names}. "
                f"Describe this workout to the user enthusiastically."
            )

        return "\n".join(parts)


# Factory function for dependency injection
def create_agents() -> Dict[str, Any]:
    """
    Create all AI agents with shared OpenRouter client.
    
    Returns:
        Dict of agent instances
    """
    client = OpenRouterClient()
    
    return {
        "mood": MoodDetectorAgent(client),
        "daily_brief": DailyBriefGeneratorAgent(client),
        "weekly_insights": WeeklyInsightsAgent(client),
        "chat": ChatAgent(client),
        "openrouter": client
    }
