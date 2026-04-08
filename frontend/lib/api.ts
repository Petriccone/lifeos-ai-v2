const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lifeos_token");
}

function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lifeos_user_id");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("lifeos_token");
  localStorage.removeItem("lifeos_user_id");
  localStorage.removeItem("lifeos_email");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    logout();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Auth
export async function login(email: string) {
  const data = await apiFetch(`/api/v1/auth/token?email=${encodeURIComponent(email)}`, {
    method: "POST",
  });
  localStorage.setItem("lifeos_token", data.access_token);
  localStorage.setItem("lifeos_user_id", data.user_id);
  localStorage.setItem("lifeos_email", email);
  return data;
}

export async function register(email: string, name?: string) {
  const params = new URLSearchParams({ email });
  if (name) params.set("name", name);
  return apiFetch(`/api/v1/auth/register?${params.toString()}`, { method: "POST" });
}

// Mood
export async function getMoodSummary(days = 7) {
  return apiFetch(`/api/v1/mood/summary?days=${days}`);
}

export async function getMoodEntries(days = 7) {
  return apiFetch(`/api/v1/mood?days=${days}`);
}

// Tasks
export async function getTasks(status?: string, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  return apiFetch(`/api/v1/tasks?${params.toString()}`);
}

export async function createTask(task: { title: string; priority?: string; category?: string }) {
  return apiFetch("/api/v1/tasks", { method: "POST", body: JSON.stringify(task) });
}

export async function updateTask(id: string, updates: Record<string, unknown>) {
  return apiFetch(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
}

export async function deleteTask(id: string) {
  return apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
}

// Workouts
export async function getWorkouts(days = 30) {
  return apiFetch(`/api/v1/workouts?days=${days}`);
}

export async function createWorkout(workout: Record<string, unknown>) {
  return apiFetch("/api/v1/workouts", { method: "POST", body: JSON.stringify(workout) });
}

export async function getWorkout(id: string) {
  return apiFetch(`/api/v1/workouts/${id}`);
}

// Chat
export async function sendChatMessage(message: string, conversationHistory?: { role: string; content: string }[]) {
  return apiFetch("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversation_history: conversationHistory }),
  });
}

// Brief & Insights
export async function getDailyBrief() {
  return apiFetch("/api/v1/brief");
}

export async function getWeeklyInsights() {
  return apiFetch("/api/v1/insights/weekly");
}
