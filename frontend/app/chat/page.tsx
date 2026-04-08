"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Activity, MoreHorizontal, Check } from "lucide-react";
import { isAuthenticated, sendChatMessage } from "../../lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  moodDetected?: Record<string, number>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Hey, Rafael! I'm LifeOS AI.\nTell me how you're feeling right now or ask me to analyze your weekly metrics. I'm here to support your goals.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      if (!isAuthenticated()) {
        throw new Error("Not authenticated");
      }

      const history = messages
        .filter((m) => m.id !== "0")
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: currentInput });

      const data = await sendChatMessage(currentInput, history);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        moodDetected: data.mood_detected || undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Desculpe, nao consegui conectar ao servidor. Verifique se o backend esta rodando.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    "I'm feeling stressed",
    "Had a great workout!",
    "How was my week?",
    "Give me daily insights"
  ];

  return (
    <div className="flex flex-col max-h-[85vh] md:max-h-[85vh] h-[85vh] w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="glass-panel flex-1 rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl relative bg-black/40">

         <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

         <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative z-20 backdrop-blur-md">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                 <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                 <h1 className="text-lg font-bold text-white leading-tight">LifeOS Assistant</h1>
                 <p className="text-xs text-indigo-300 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online</p>
              </div>
           </div>
           <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-gray-400">
              <MoreHorizontal className="w-5 h-5" />
           </button>
         </header>

         <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-0 scrollbar-hide">
           {messages.map((message) => (
             <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""} animate-fadeIn`}>

               <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                 message.role === "assistant"
                   ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md"
                   : "bg-white/10 border border-white/5"
               }`}>
                 {message.role === "assistant" ? <Sparkles className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-gray-300" />}
               </div>

               <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[70%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-4 text-sm leading-relaxed ${
                    message.role === "assistant"
                      ? "bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm text-gray-200 backdrop-blur-sm"
                      : "bg-indigo-600 rounded-2xl rounded-tr-sm text-white shadow-lg"
                  }`}>
                    {message.content.split('\n').map((line, i) => (
                       <span key={i}>{line}<br/></span>
                    ))}
                  </div>

                  {message.moodDetected && (
                     <div className="mt-1 p-3 rounded-2xl bg-black/40 border border-white/5 flex gap-3 text-[10px] items-center animate-fadeIn">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span className="text-gray-400 uppercase tracking-widest font-medium">Mood Detected</span>
                        {Object.entries(message.moodDetected).map(([k, v]) => (
                           <div key={k} className="flex items-center gap-1">
                              <span className="text-gray-500 capitalize">{k}</span>
                              <span className="text-indigo-300">{typeof v === 'number' ? Math.round(v) : v}%</span>
                           </div>
                        ))}
                     </div>
                  )}

                  <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                    {message.role === "user" ? <Check className="w-3 h-3" /> : null}
                    Just now
                  </span>
               </div>
             </div>
           ))}

           {loading && (
             <div className="flex gap-4 animate-fadeIn">
               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                 <Sparkles className="w-5 h-5 text-white" />
               </div>
               <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm backdrop-blur-sm flex items-center gap-2">
                 <div className="flex gap-1.5">
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                   <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                   <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                 </div>
               </div>
             </div>
           )}
         </div>

         <div className="p-4 md:p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-xl relative z-20">

           <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
             {quickActions.map((phrase) => (
               <button
                 key={phrase}
                 onClick={() => setInput(phrase)}
                 className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all text-gray-300 hover:text-white"
               >
                 {phrase}
               </button>
             ))}
           </div>

           <div className="relative group">
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
             <div className="relative flex gap-2 w-full">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleSend()}
                 placeholder="Share your thoughts..."
                 className="flex-1 bg-black/60 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 text-sm text-white placeholder:text-gray-500 transition-all font-medium backdrop-blur-md"
               />
               <button
                 onClick={handleSend}
                 disabled={loading || !input.trim()}
                 className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center disabled:opacity-40 disabled:grayscale transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] active:scale-95"
               >
                 <Send className="w-5 h-5 text-white ml-1" />
               </button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}
