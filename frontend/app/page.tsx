"use client";

import { useState, useEffect } from "react";

interface MoodData {
  anxiety: number;
  happiness: number;
  wellness: number;
  sleep: number;
  recovery: number;
}

interface HealthData {
  mood_score: number;
  anxiety: number;
  happiness: number;
  wellness: number;
  sleep: number;
  recovery: number;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  category?: string;
}

interface Brief {
  date: string;
  mood_summary: string;
  health_score: number;
  recommended_tasks: Task[];
  ai_insights: string;
}

// Circular Gauge Component
function CircularGauge({ value, label, color, size = 80 }: { value: number; label: string; color: string; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-[#1a1a2e]"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

// Mini Metric Ring
function MetricRing({ label, value, color }: { label: string; value: number; color: string }) {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1a1a2e" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium text-white">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

// Category Tile
function CategoryTile({ title, icon, gradient, onClick }: { title: string; icon: string; gradient: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${gradient} p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-white">{title}</span>
    </button>
  );
}

// Task Item
function TaskItem({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const priorityColors: Record<string, string> = {
    urgent: "border-red-500",
    high: "border-orange-500",
    medium: "border-yellow-500",
    low: "border-green-500",
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-[#1a1a2e] rounded-xl border-l-4 ${priorityColors[task.priority] || "border-gray-500"}`}>
      <button onClick={onToggle} className="text-gray-400 hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
        </svg>
      </button>
      <span className="flex-1 text-sm text-white">{task.title}</span>
      <span className={`text-[10px] px-2 py-1 rounded-full ${
        task.priority === "urgent" ? "bg-red-500/20 text-red-400" :
        task.priority === "high" ? "bg-orange-500/20 text-orange-400" :
        "bg-gray-500/20 text-gray-400"
      }`}>
        {task.priority}
      </span>
    </div>
  );
}

// AI Chat Bubble
function AIChatBubble({ message }: { message: string }) {
  return (
    <div className="flex gap-3 p-4 bg-[#1a1a2e] rounded-2xl">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
        ✨
      </div>
      <p className="text-sm text-gray-300">{message}</p>
    </div>
  );
}

export default function Home() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demo - in production, fetch from API
    setHealthData({
      mood_score: 72,
      anxiety: 0.25,
      happiness: 0.65,
      wellness: 0.78,
      sleep: 0.88,
      recovery: 0.74,
    });

    setTasks([
      { id: "1", title: "Review Q2 goals", priority: "high", status: "todo", category: "work" },
      { id: "2", title: "Gym - Leg Day", priority: "medium", status: "todo", category: "physical" },
      { id: "3", title: "Call mom", priority: "low", status: "todo", category: "social" },
    ]);

    setBrief({
      date: new Date().toISOString().split("T")[0],
      mood_summary: "You've been feeling pretty good this week! Energy levels are up and sleep quality has improved.",
      health_score: 72,
      recommended_tasks: [
        { id: "1", title: "Review Q2 goals", priority: "high", status: "todo" },
        { id: "2", title: "Gym - Leg Day", priority: "medium", status: "todo" },
      ],
      ai_insights: "Your sleep score is excellent (88%). Keep maintaining that consistent bedtime routine!",
    });

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white">Loading LifeOS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Header */}
      <header className="px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            LifeOS AI
          </h1>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
        </div>
        <div className="flex gap-3">
          <button className="w-10 h-10 rounded-full bg-[#1a1a2e] flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-sm font-bold">R</span>
          </button>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Health Score Section */}
        <section className="bg-[#1a1a2e] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Health Score</h2>
              <p className="text-sm text-gray-400">Your overall wellbeing</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-green-400">{healthData?.mood_score || 0}</span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
          </div>

          {/* Main Score Gauge */}
          <div className="flex justify-center mb-6">
            <CircularGauge value={healthData?.mood_score || 0} label="Health" color="#10b981" size={140} />
          </div>

          {/* Workout Type Button */}
          <button className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-medium text-sm mb-6 flex items-center justify-center gap-2">
            <span>🏋️</span>
            <span>Push Day</span>
          </button>

          {/* Mini Metrics Grid */}
          <div className="grid grid-cols-5 gap-2">
            <MetricRing label="Anxiety" value={(healthData?.anxiety || 0) * 100} color="#ef4444" />
            <MetricRing label="Happiness" value={(healthData?.happiness || 0) * 100} color="#10b981" />
            <MetricRing label="Wellness" value={(healthData?.wellness || 0) * 100} color="#3b82f6" />
            <MetricRing label="Sleep" value={(healthData?.sleep || 0) * 100} color="#8b5cf6" />
            <MetricRing label="Recovery" value={(healthData?.recovery || 0) * 100} color="#06b6d4" />
          </div>
        </section>

        {/* Life Progress Chart */}
        <section className="bg-[#1a1a2e] rounded-3xl p-6">
          <h2 className="text-lg font-semibold mb-4">Life Progress</h2>
          <div className="h-32 flex items-end justify-between gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
              const heights = [45, 60, 55, 70, 65, 80, 72];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg transition-all"
                    style={{ height: `${heights[i]}%` }}
                  />
                  <span className="text-xs text-gray-500">{day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-500" /> This Week
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/50" /> Prev Week
            </span>
          </div>
        </section>

        {/* Tasks Section */}
        <section className="bg-[#1a1a2e] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Today's Tasks</h2>
              <p className="text-sm text-gray-500">{tasks.filter(t => t.status === "todo").length} pending</p>
            </div>
            <button className="text-purple-400 text-sm font-medium">+ Add Task</button>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 3).map(task => (
              <TaskItem key={task.id} task={task} onToggle={() => {}} />
            ))}
          </div>
        </section>

        {/* Category Tiles */}
        <section className="grid grid-cols-2 gap-3">
          <CategoryTile title="Mental Health" icon="🧠" gradient="bg-gradient-to-br from-purple-600 to-purple-900" onClick={() => {}} />
          <CategoryTile title="Physical Health" icon="💪" gradient="bg-gradient-to-br from-red-600 to-orange-900" onClick={() => {}} />
          <CategoryTile title="Work & Productivity" icon="💼" gradient="bg-gradient-to-br from-blue-600 to-blue-900" onClick={() => {}} />
          <CategoryTile title="Social & Financial" icon="💰" gradient="bg-gradient-to-br from-yellow-600 to-orange-900" onClick={() => {}} />
        </section>

        {/* AI Insight */}
        <section className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-3xl p-6 border border-purple-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              ✨
            </div>
            <div>
              <h3 className="font-semibold mb-1">AI Insight</h3>
              <p className="text-sm text-gray-300">{brief?.ai_insights}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating AI Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 transition-transform"
      >
        <span className="text-xl">✨</span>
      </button>

      {/* Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">LifeOS AI Chat</h3>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AIChatBubble message="Hey! How are you feeling today? I can help track your mood, suggest workouts, or just chat." />
            </div>
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Tell me how you feel..."
                  className="flex-1 bg-[#0a0a0f] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
