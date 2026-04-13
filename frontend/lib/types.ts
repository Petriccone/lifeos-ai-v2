// Shared TypeScript types for LifeOS API responses and requests.
// UUIDs and ISO datetimes are represented as `string`.

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MoodEntry {
  id: string;
  user_id?: string;
  anxiety: number;
  happiness: number;
  wellness: number;
  sleep_quality?: number | null;
  recovery?: number | null;
  energy?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface MoodSummary {
  anxiety: number;
  happiness: number;
  wellness: number;
  sleep: number;
  recovery: number;
  energy: number;
  count: number;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  priority?: TaskPriority | string;
  category?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
  message?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority: TaskPriority | string;
  category?: string;
  due_date?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group?: string | null;
  equipment?: string | null;
  exercise_type?: string | null;
}

export interface WorkoutSet {
  reps: number;
  weight: number; // in kg; 0 for bodyweight
  rpe?: number; // rate of perceived exertion 1-10
}

export interface WorkoutExerciseEntry {
  id?: string;
  exercise_id?: string;
  name?: string; // denormalized for UI display on GET /workouts/:id
  sets: WorkoutSet[];
  notes?: string | null;
}

export interface Workout {
  id: string;
  name?: string | null;
  workout_type?: string | null;
  type?: string; // legacy alias, server returns workout_type
  duration_minutes?: number | null;
  intensity?: string;
  calories_burned?: number | null;
  notes?: string | null;
  started_at?: string;
  ended_at?: string | null;
  created_at?: string;
  exercises?: WorkoutExerciseEntry[];
}

export interface WorkoutCreate {
  name?: string;
  workout_type: string;
  duration_minutes?: number;
  notes?: string;
  exercises?: Array<{
    exercise_id: string;
    sets: WorkoutSet[];
    notes?: string | null;
  }>;
}

// AI workout generator
export type WorkoutGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AiWorkoutRequest {
  goal: WorkoutGoal;
  level: WorkoutLevel;
  duration_minutes: number;
  workout_type: string;
  equipment: string[];
  notes?: string;
}

export interface AiExerciseSuggestion {
  exercise_id: string | null;
  name: string;
  muscle_group?: string | null;
  sets: WorkoutSet[];
  notes?: string | null;
}

export interface AiWorkoutResponse {
  name: string;
  workout_type: string;
  duration_minutes: number;
  notes?: string | null;
  exercises: AiExerciseSuggestion[];
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
}

export interface WorkoutGeneratedFromChat {
  id: string;
  name: string;
  workout_type: string;
  duration_minutes: number;
  notes?: string | null;
  exercises: Array<{
    name: string;
    muscle_group?: string | null;
    sets: Array<{ reps: number; weight: number; rpe?: number | null }>;
    notes?: string | null;
  }>;
}

export interface ChatResponse {
  response: string;
  mood_detected?: string | null;
  suggested_action?: string | null;
  workout_generated?: WorkoutGeneratedFromChat | null;
}

export interface DailyBrief {
  date: string;
  greeting?: string;
  summary?: string;
  priorities?: string[];
  mood_insight?: string;
  workout_recommendation?: string;
  [key: string]: unknown;
}
