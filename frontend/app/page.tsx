"use client";

import { useState, useEffect } from "react";
import { MessageSquare, HeartPulse, Target, Activity, Moon, BatteryCharging, Zap, Plus, Sparkles } from "lucide-react";
import { isAuthenticated, login, register, getMoodSummary, getTasks, getDailyBrief } from "../lib/api";

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
}

function MiniGauge({ value, color, icon: Icon, label }: { value: number; color: string; icon: any; label: string }) {
  return (
    <div className="glass-card p-4 flex flex-col justify-between hover:bg-white/[0.08] transition-colors h-28">
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-sm font-semibold">{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
         <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-400 mt-2">{label}</span>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, name || undefined);
      }
      await login(email);
      onLogin();
    } catch (err: any) {
      setError(isRegister ? "Erro ao registrar. Tente fazer login." : "Email nao encontrado. Tente registrar.");
    } finally {
      setLoading(false);
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
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? "..." : isRegister ? "Registrar" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [briefSummary, setBriefSummary] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  useEffect(() => {
    if (!authed) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [authed]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [moodData, tasksData] = await Promise.all([
        getMoodSummary(7).catch(() => null),
        getTasks("pending", 5).catch(() => []),
      ]);

      if (moodData && moodData.count > 0) {
        setHealthData({
          mood_score: Math.round(
            ((moodData.happiness + moodData.wellness + moodData.sleep + moodData.recovery + (100 - moodData.anxiety)) / 5)
          ),
          anxiety: moodData.anxiety / 100,
          happiness: moodData.happiness / 100,
          wellness: moodData.wellness / 100,
          sleep: moodData.sleep / 100,
          recovery: moodData.recovery / 100,
        });
      } else {
        setHealthData({ mood_score: 0, anxiety: 0, happiness: 0, wellness: 0, sleep: 0, recovery: 0 });
      }

      setTasks(tasksData || []);

      // Fetch brief in background (AI-generated, may be slow)
      getDailyBrief()
        .then((brief) => setBriefSummary(brief.summary || brief.mood_insight || null))
        .catch(() => null);
    } catch {
      // Fallback if API is down
      setHealthData({ mood_score: 0, anxiety: 0, happiness: 0, wellness: 0, sleep: 0, recovery: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  if (loading) return (
     <div className="flex-1 flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
           <Zap className="w-8 h-8 text-indigo-400" />
           <p className="text-white/50 text-sm">Syncing LifeOS...</p>
        </div>
     </div>
  );

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-32 md:pb-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{greeting}, Rafael</h2>
           <p className="text-sm text-gray-400">Here&apos;s your weekly synthesis.</p>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

        {/* Main Score */}
        <div className="glass-panel rounded-3xl p-6 md:row-span-2 relative overflow-hidden flex flex-col justify-between group h-full min-h-[300px]">
           <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                 <HeartPulse className="text-emerald-400 w-5 h-5" />
                 <h3 className="font-semibold text-white">Health Score</h3>
              </div>
              <p className="text-xs text-gray-400">{healthData && healthData.mood_score > 70 ? "Optimal status reached" : "Keep tracking your metrics"}</p>
           </div>

           <div className="flex flex-col items-center justify-center py-6 relative flex-1">
               <div className="relative w-44 h-44 flex items-center justify-center">
                 <div className="absolute inset-0 border-[8px] border-white/5 rounded-full" />
                 <div className="absolute inset-0 border-[8px] border-emerald-400 rounded-full border-t-transparent border-l-transparent transform -rotate-45 transition-all duration-1000" />
                 <div className="flex flex-col items-center z-10">
                   <div className="text-5xl font-bold text-white mb-1 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{healthData?.mood_score || 0}</div>
                   <span className="text-xs text-gray-400">/100</span>
                 </div>
               </div>
           </div>

           <div className="flex gap-2 relative z-10 w-full mt-4">
               <a href="/chat" className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium transition-all rounded-xl border border-white/5 text-center">
                   Log Entry
               </a>
               <button className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[13px] font-medium transition-all rounded-xl flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                   <Zap className="w-3.5 h-3.5" /> Xiaomi Sync
               </button>
           </div>
        </div>

        {/* Metrics Grid */}
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
           <MiniGauge value={healthData?.happiness || 0} color="#c084fc" icon={HeartPulse} label="Happiness" />
           <MiniGauge value={healthData?.sleep || 0} color="#60a5fa" icon={Moon} label="Sleep" />
           <MiniGauge value={healthData?.recovery || 0} color="#34d399" icon={BatteryCharging} label="Recovery" />
           <MiniGauge value={healthData?.anxiety || 0} color="#f87171" icon={Activity} label="Stress" />
        </div>

        {/* Tasks Section */}
        <div className="glass-panel rounded-3xl p-6 md:col-span-1 flex flex-col h-full min-h-[220px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-pink-400" /> Priorities</h3>
              <button className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
           </div>
           <div className="space-y-3 flex-1">
              {tasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma tarefa pendente</p>
              )}
              {tasks.map(task => (
                 <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/5 group cursor-pointer">
                    <div className="w-4 h-4 rounded-md border border-gray-500 flex-shrink-0 group-hover:border-indigo-400 transition-colors" />
                    <span className="text-sm text-gray-200 flex-1 truncate">{task.title}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' || task.priority === 'urgent' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                 </div>
              ))}
           </div>
        </div>

        {/* AI Insight */}
        <div className="glass-panel rounded-3xl p-6 md:col-span-1 relative overflow-hidden flex flex-col justify-end min-h-[220px] group border-indigo-500/20">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
           <div className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-indigo-300" />
           </div>
           <div className="relative z-10 mt-16">
              <h3 className="font-semibold text-white mb-2 text-lg">AI Synthesis</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                 {briefSummary || "Use the chat to log your mood and I'll generate personalized insights for you."}
              </p>
           </div>
        </div>

      </div>

      {/* Floating Chat Trigger */}
      <a
         href="/chat"
         className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-110 hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all z-50 group"
      >
         <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </a>
    </div>
  );
}
