"use client";

import { useState, useEffect } from "react";
import { MessageSquare, HeartPulse, Target, Activity, Moon, BatteryCharging, Zap, Plus, Sparkles } from "lucide-react";

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

// Custom specialized Components
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

export default function DashboardPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demo
    setHealthData({ mood_score: 84, anxiety: 0.15, happiness: 0.85, wellness: 0.82, sleep: 0.90, recovery: 0.78 });
    setTasks([
      { id: "1", title: "Review UI feedback", priority: "high", status: "todo" },
      { id: "2", title: "Upper Body Workout", priority: "medium", status: "todo" },
      { id: "3", title: "Read 20 pages", priority: "low", status: "todo" },
    ]);
    setLoading(false);
  }, []);

  const handleWatchSync = async () => {
    try {
       const res = await fetch("http://localhost:8000/api/v1/health-sync/google/login-url");
       const data = await res.json();
       if (data.url) {
           window.location.href = data.url; // Redireciona para o Google OAuth
       }
    } catch (err) {
       console.error("Failed to fetch sync URL", err);
       alert("O backend do LifeOS precisa estar rodando para sincronizar o smartwatch.");
    }
  };

  if (loading) return (
     <div className="flex-1 flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
           <Zap className="w-8 h-8 text-indigo-400" />
           <p className="text-white/50 text-sm">Syncing LifeOS...</p>
        </div>
     </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-32 md:pb-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">Good evening, Rafael</h2>
           <p className="text-sm text-gray-400">Here's your weekly synthesis.</p>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        {/* Main Score - takes 1 column, spans 2 rows on desktop */}
        <div className="glass-panel rounded-3xl p-6 md:row-span-2 relative overflow-hidden flex flex-col justify-between group h-full min-h-[300px]">
           <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full" />
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                 <HeartPulse className="text-emerald-400 w-5 h-5" />
                 <h3 className="font-semibold text-white">Health Score</h3>
              </div>
              <p className="text-xs text-gray-400">Optimal status reached</p>
           </div>
           
           <div className="flex flex-col items-center justify-center py-6 relative flex-1">
               <div className="absolute inset-0 border-[8px] border-white/5 rounded-full w-44 h-44 m-auto" />
               <div className="absolute inset-0 border-[8px] border-emerald-400 rounded-full w-44 h-44 m-auto border-t-transparent border-l-transparent transform -rotate-45 transition-all duration-1000" />
               <div className="text-5xl font-bold text-white mb-1 relative z-10 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{healthData?.mood_score}</div>
               <span className="text-xs text-gray-400 relative z-10">/100</span>
           </div>

           <div className="flex gap-2 relative z-10 w-full mt-4">
               <button className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium transition-all rounded-xl border border-white/5">
                   Log Entry
               </button>
               <button onClick={handleWatchSync} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[13px] font-medium transition-all rounded-xl flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
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
              {tasks.map(task => (
                 <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition border border-white/5 group cursor-pointer">
                    <div className="w-4 h-4 rounded-md border border-gray-500 flex-shrink-0 group-hover:border-indigo-400 transition-colors" />
                    <span className="text-sm text-gray-200 flex-1 truncate">{task.title}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-orange-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                 </div>
              ))}
           </div>
        </div>

        {/* Insight / Progress */}
        <div className="glass-panel rounded-3xl p-6 md:col-span-1 relative overflow-hidden flex flex-col justify-end min-h-[220px] group border-indigo-500/20">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
           <div className="absolute top-6 left-6 w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-indigo-300" />
           </div>
           <div className="relative z-10 mt-16">
              <h3 className="font-semibold text-white mb-2 text-lg">AI Synthesis</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                 You've been incredibly consistent this week. Your sleep score is up 12% directly correlating with reduced stress levels. Keep the momentum.
              </p>
           </div>
        </div>

      </div>

      {/* Floating Chat Trigger */}
      <button 
         onClick={() => setChatOpen(true)}
         className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-110 hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all z-50 group"
      >
         <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Basic Chat Modal implementation */}
      {chatOpen && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-md transition-all">
            <div className="w-full md:w-[450px] bg-[#0c0c10] md:border border-white/10 md:rounded-3xl h-[85vh] md:h-[600px] flex flex-col shadow-2xl animate-fadeIn">
               <div className="p-4 md:p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"><Sparkles className="w-4 h-4 text-white" /></div>
                     <span className="font-semibold text-white">LifeOS Assistant</span>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">✕</button>
               </div>
               <div className="flex-1 p-5 overflow-y-auto hidden-scrollbar">
                  <div className="flex gap-4 animate-fadeIn">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center mt-1"><Sparkles className="w-4 h-4 text-white" /></div>
                     <div className="bg-white/10 backdrop-blur border border-white/5 p-4 rounded-2xl rounded-tl-sm text-sm text-gray-200 leading-relaxed shadow-sm">
                        Hello! Based on your metrics, pushing a hard workout today seems ideal. Ready to log it?
                     </div>
                  </div>
               </div>
               <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                  <input type="text" placeholder="Type a message..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-black/60 transition-all placeholder:text-gray-600" />
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
