"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";
import {
  MessageSquare,
  HeartPulse,
  Target,
  Activity,
  Moon,
  BatteryCharging,
  Zap,
  Plus,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import { api, ApiError, isAuthenticated, login, register } from "@/lib/api";

interface HealthData {
  mood_score: number;
  anxiety: number;
  happiness: number;
  wellness: number;
  sleep: number;
  recovery: number;
  count: number;
}

interface TaskLite {
  id: string;
  title: string;
  status?: string;
  priority?: string;
}

interface ChatItem {
  role: "user" | "assistant";
  content: string;
}

type IconType = ComponentType<{ className?: string; style?: React.CSSProperties }>;

function MiniGauge({
  value,
  color,
  icon: Icon,
  label,
}: {
  value: number;
  color: string;
  icon: IconType;
  label: string;
}) {
  return (
    <div className="glass-card p-3 md:p-4 flex flex-col justify-between hover:bg-white/[0.08] transition-colors h-24 md:h-28">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-sm font-semibold">{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-400 mt-2">{label}</span>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [err, setErr] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoadingForm(true);
    try {
      if (isRegister) {
        await register(email, name || undefined);
      }
      await login(email);
      onLogin();
    } catch {
      setErr(isRegister ? "Erro ao registrar. Tente fazer login." : "Email nao encontrado. Tente registrar.");
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[80vh]">
      <div className="glass-panel rounded-3xl p-8 w-full max-w-sm border border-white/10">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <span className="text-3xl">☀️</span>
          <h1 className="text-2xl font-bold gradient-text-premium">LifeOS</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600"
          />
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button
            type="submit"
            disabled={loadingForm}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {loadingForm ? "..." : isRegister ? "Registrar" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setErr(""); }}
            className="w-full text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isRegister ? "Ja tenho conta" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [briefSummary, setBriefSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [logEntryOpen, setLogEntryOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const [moodText, setMoodText] = useState("");
  const [submittingMood, setSubmittingMood] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, taskList] = await Promise.all([
        api.mood.summary(7).catch(() => null),
        api.tasks.list().catch(() => [] as TaskLite[]),
      ]);

      if (summary && summary.count > 0) {
        setHealthData({
          mood_score: Math.round(
            ((summary.happiness + summary.wellness + summary.sleep + summary.recovery + (100 - summary.anxiety)) / 5)
          ),
          anxiety: summary.anxiety / 100,
          happiness: summary.happiness / 100,
          wellness: summary.wellness / 100,
          sleep: summary.sleep / 100,
          recovery: summary.recovery / 100,
          count: summary.count,
        });
      } else {
        setHealthData({ mood_score: 0, anxiety: 0, happiness: 0, wellness: 0, sleep: 0, recovery: 0, count: 0 });
      }

      setTasks(Array.isArray(taskList) ? taskList : []);

      api.brief
        .today()
        .then((brief: any) => setBriefSummary(brief?.summary || brief?.mood_insight || null))
        .catch(() => null);
    } catch {
      setHealthData({ mood_score: 0, anxiety: 0, happiness: 0, wellness: 0, sleep: 0, recovery: 0, count: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [authed, loadAll]);

  const handleWatchSync = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiBase}/api/v1/health-sync/google/login-url`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to fetch sync URL", err);
      alert("O backend do LifeOS precisa estar rodando para sincronizar o smartwatch.");
    }
  };

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || savingTask) return;
    setSavingTask(true);
    try {
      const created = await api.tasks.create({ title, priority: "medium" });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle("");
      setAddingTask(false);
    } catch (err) {
      if (err instanceof ApiError) setError(`Failed to create task (${err.status}).`);
      else setError("Failed to create task.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleSubmitMood = async () => {
    if (submittingMood) return;
    setSubmittingMood(true);
    setMoodError(null);
    try {
      await api.mood.create({
        anxiety: 50,
        happiness: 50,
        wellness: 50,
        sleep: 50,
        recovery: 50,
        source_text: moodText || null,
      });
      setMoodText("");
      setLogEntryOpen(false);
      await loadAll();
    } catch (err) {
      if (err instanceof ApiError) setMoodError(`Could not log entry (${err.status}).`);
      else setMoodError("Could not log entry.");
    } finally {
      setSubmittingMood(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg: ChatItem = { role: "user", content: text };
    const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await api.chat.send({ message: text, conversation_history: history });
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (err) {
      const message = err instanceof ApiError ? `Assistant unavailable (${err.status}).` : "Assistant unavailable.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Zap className="w-8 h-8 text-indigo-400" />
          <p className="text-white/50 text-sm">Syncing LifeOS...</p>
        </div>
      </div>
    );
  }

  const hasMoodData = (healthData?.count ?? 0) > 0;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-8 max-w-6xl mx-auto pb-28 md:pb-8 w-full overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{greeting}, Rafael</h2>
          <p className="text-sm text-gray-400">Here&apos;s your weekly synthesis.</p>
        </div>
      </div>

      {error && (
        <div className="glass-card border border-red-500/30 bg-red-500/10 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-200">{error}</div>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <div className="glass-panel rounded-3xl p-5 md:p-6 md:row-span-2 relative overflow-hidden flex flex-col justify-between group h-full min-h-[240px] md:min-h-[300px]">
          <div className="absolute -right-10 -top-10 w-32 h-32 md:w-40 md:h-40 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="text-emerald-400 w-5 h-5" />
              <h3 className="font-semibold text-white">Health Score</h3>
            </div>
            <p className="text-xs text-gray-400">
              {hasMoodData ? "Optimal status reached" : "Awaiting first entry"}
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center py-6 relative">
            {hasMoodData ? (
              <div className="text-6xl font-bold text-white">{healthData?.mood_score ?? 0}</div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="w-8 h-8 text-indigo-300 mb-3" />
                <p className="text-sm text-gray-300 mb-4">Log your first mood to see your health score.</p>
                <button
                  onClick={() => setLogEntryOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  Log first mood
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 relative z-10 w-full mt-3">
            <button
              onClick={() => setLogEntryOpen(true)}
              className="flex-1 py-2.5 md:py-3 bg-white/10 hover:bg-white/20 text-white text-xs md:text-[13px] font-medium transition-all rounded-xl border border-white/5"
            >
              Log Entry
            </button>
            <button
              onClick={handleWatchSync}
              className="flex-1 py-2.5 md:py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs md:text-[13px] font-medium transition-all rounded-xl flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.3)] truncate"
            >
              <Zap className="w-3 h-3 flex-shrink-0" /> Xiaomi Sync
            </button>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <MiniGauge value={healthData?.happiness || 0} color="#c084fc" icon={HeartPulse} label="Happiness" />
          <MiniGauge value={healthData?.sleep || 0} color="#60a5fa" icon={Moon} label="Sleep" />
          <MiniGauge value={healthData?.recovery || 0} color="#34d399" icon={BatteryCharging} label="Recovery" />
          <MiniGauge value={healthData?.anxiety || 0} color="#f87171" icon={Activity} label="Stress" />
        </div>

        <div className="glass-panel rounded-3xl p-5 md:p-6 md:col-span-1 flex flex-col h-full min-h-[180px] md:min-h-[220px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-pink-400" /> Priorities
            </h3>
            <button
              onClick={() => setAddingTask((v) => !v)}
              aria-label="Add task"
              className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {addingTask && (
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="New task title..."
                autoFocus
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || savingTask}
                className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {savingTask ? "..." : "Add"}
              </button>
            </div>
          )}

          <div className="space-y-3 flex-1">
            {tasks.length === 0 && !addingTask ? (
              <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
                <p className="text-sm text-gray-400">No tasks yet.</p>
                <button
                  onClick={() => setAddingTask(true)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
                >
                  Add your first task
                </button>
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/5 group cursor-pointer"
                >
                  <div className="w-4 h-4 rounded-md border border-gray-500 flex-shrink-0 group-hover:border-indigo-400 transition-colors" />
                  <span className="text-sm text-gray-200 flex-1 truncate">{task.title}</span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      task.priority === "urgent"
                        ? "bg-red-500"
                        : task.priority === "high"
                        ? "bg-orange-500"
                        : task.priority === "medium"
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-5 md:p-6 md:col-span-1 relative overflow-hidden flex flex-col justify-end min-h-[180px] md:min-h-[220px] group border-indigo-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
          <div className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="relative z-10 mt-16">
            <h3 className="font-semibold text-white mb-2 text-lg">AI Synthesis</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {briefSummary
                ? briefSummary
                : hasMoodData
                ? "You've been consistent this week. Keep the momentum and let LifeOS guide your next best action."
                : "Log your first mood entry to unlock personalized AI synthesis."}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setChatOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-110 hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all z-50 group"
      >
        <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-md transition-all">
          <div className="w-full md:w-[450px] bg-[#0c0c10] md:border border-white/10 md:rounded-3xl h-[85vh] md:h-[600px] flex flex-col shadow-2xl animate-fadeIn">
            <div className="p-4 md:p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white">LifeOS Assistant</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto hidden-scrollbar space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex gap-4 animate-fadeIn">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center mt-1">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/10 backdrop-blur border border-white/5 p-4 rounded-2xl rounded-tl-sm text-sm text-gray-200 leading-relaxed shadow-sm">
                    Hello! Ask me anything about your metrics or how you&apos;re feeling.
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center mt-1">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-white/10 border border-white/5 text-gray-200 rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-black/60 transition-all placeholder:text-gray-600"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-4 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {logEntryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0c10] border border-white/10 rounded-3xl p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-400" /> Log Entry
              </h3>
              <button
                onClick={() => setLogEntryOpen(false)}
                aria-label="Close log entry"
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              How are you feeling? We&apos;ll log neutral baseline metrics with your note.
            </p>
            <textarea
              value={moodText}
              onChange={(e) => setMoodText(e.target.value)}
              rows={4}
              placeholder="A short note about how you feel..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
            {moodError && <div className="mt-2 text-xs text-red-400">{moodError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setLogEntryOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMood}
                disabled={submittingMood}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {submittingMood ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
