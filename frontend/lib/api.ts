const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_STORAGE_KEY = "lifeos_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
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
    throw new ApiError(res.status, null, "Unauthorized");
  }

  if (!res.ok) {
    let body: unknown = null;
    let text = "";
    try {
      text = await res.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, body, `API error ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// Flat exports (HEAD / backward compatibility)
export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("lifeos_token");
  localStorage.removeItem("lifeos_user_id");
  localStorage.removeItem("lifeos_email");
}

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

export async function getMoodSummary(days = 7) {
  return apiFetch(`/api/v1/mood/summary?days=${days}`);
}

export async function getMoodEntries(days = 7) {
  return apiFetch(`/api/v1/mood?days=${days}`);
}

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

export async function getWorkouts(days = 30) {
  return apiFetch(`/api/v1/workouts?days=${days}`);
}

export async function createWorkout(workout: Record<string, unknown>) {
  return apiFetch("/api/v1/workouts", { method: "POST", body: JSON.stringify(workout) });
}

export async function getWorkout(id: string) {
  return apiFetch(`/api/v1/workouts/${id}`);
}

export async function sendChatMessage(message: string, conversationHistory?: { role: string; content: string }[]) {
  return apiFetch("/api/v1/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversation_history: conversationHistory }),
  });
}

export async function getDailyBrief() {
  return apiFetch("/api/v1/brief");
}

export async function getWeeklyInsights() {
  return apiFetch("/api/v1/insights/weekly");
}

// Namespaced `api` object (richer, used by gym tracking + AI generator features)
export const api = {
  auth: {
    register: (data: { email: string; password: string; name?: string }) =>
      apiFetch("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      apiFetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) }),
    me: () => apiFetch("/api/v1/auth/me"),
  },
  mood: {
    list: (days = 7) => apiFetch(`/api/v1/mood?days=${days}`),
    create: (data: any) =>
      apiFetch("/api/v1/mood", { method: "POST", body: JSON.stringify(data) }),
    summary: (days = 7) => apiFetch(`/api/v1/mood/summary?days=${days}`),
  },
  tasks: {
    list: () => apiFetch("/api/v1/tasks"),
    create: (data: any) =>
      apiFetch("/api/v1/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" }),
  },
  workouts: {
    list: (days = 30) => apiFetch(`/api/v1/workouts?days=${days}`),
    get: (id: string) => apiFetch(`/api/v1/workouts/${id}`),
    create: (data: any) =>
      apiFetch("/api/v1/workouts", { method: "POST", body: JSON.stringify(data) }),
    aiGenerate: (data: any) =>
      apiFetch("/api/v1/workouts/ai-generate", { method: "POST", body: JSON.stringify(data) }),
  },
  exercises: {
    list: (muscleGroup?: string) => {
      const q = muscleGroup ? `?muscle_group=${encodeURIComponent(muscleGroup)}` : "";
      return apiFetch(`/api/v1/exercises${q}`);
    },
    create: (data: any) => {
      const qs = new URLSearchParams();
      qs.set("name", data.name);
      if (data.muscle_group) qs.set("muscle_group", data.muscle_group);
      if (data.equipment) qs.set("equipment", data.equipment);
      if (data.exercise_type) qs.set("exercise_type", data.exercise_type);
      return apiFetch(`/api/v1/exercises?${qs.toString()}`, { method: "POST" });
    },
  },
  chat: {
    send: (data: any) =>
      apiFetch("/api/v1/chat", { method: "POST", body: JSON.stringify(data) }),
  },
  brief: {
    today: () => apiFetch("/api/v1/brief"),
  },
};

export { ApiError, API_URL as BASE_URL, TOKEN_STORAGE_KEY };
