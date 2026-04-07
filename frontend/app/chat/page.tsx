"use client";

import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  moodDetected?: {
    anxiety?: number;
    happiness?: number;
    wellness?: number;
    sleep?: number;
    recovery?: number;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Hey! I'm LifeOS AI ✨ Tell me how you're feeling today and I'll help you track your mood, suggest tasks, or just chat!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I hear you! It's completely normal to feel that way. Want me to log this mood for you?",
        "That sounds tough. Remember, small steps lead to big changes. What's one thing you could do today to feel a bit better?",
        "Great to hear you're feeling good! Your happiness score seems high today. Keep it up! 💪",
        "I understand. Would you like me to suggest some relaxing exercises or a lighter workout today?",
      ];

      const moodDetected = {
        anxiety: Math.random() * 0.4,
        happiness: 0.5 + Math.random() * 0.4,
        wellness: 0.6 + Math.random() * 0.3,
        sleep: 0.7 + Math.random() * 0.2,
        recovery: 0.5 + Math.random() * 0.4,
      };

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        moodDetected,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <p className="text-sm text-gray-500">Talk to your personal AI assistant</p>
      </header>

      {/* Mood Indicators (if detected) */}
      {messages.length > 1 && messages[messages.length - 1].moodDetected && (
        <div className="px-4 py-3 bg-[#1a1a2e] border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Detected Mood:</p>
          <div className="flex gap-4 text-xs">
            {Object.entries(messages[messages.length - 1].moodDetected!).map(([key, value]) => (
              <div key={key} className="text-center">
                <p className="text-gray-400 capitalize">{key}</p>
                <p className="font-semibold text-green-400">{Math.round((value || 0) * 100)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "assistant"
                  ? "bg-gradient-to-br from-purple-500 to-pink-500"
                  : "bg-blue-500"
              }`}
            >
              {message.role === "assistant" ? "✨" : "👤"}
            </div>
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.role === "assistant"
                  ? "bg-[#1a1a2e] rounded-tl-sm"
                  : "bg-blue-600 rounded-tr-sm"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              ✨
            </div>
            <div className="bg-[#1a1a2e] p-4 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Tell me how you're feeling..."
            className="flex-1 bg-[#1a1a2e] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {["I'm feeling stressed 😰", "Had a great day! 🎉", "Feeling tired 😴", "Need motivation 💪"].map((phrase) => (
            <button
              key={phrase}
              onClick={() => setInput(phrase)}
              className="px-3 py-2 bg-[#1a1a2e] rounded-full text-xs whitespace-nowrap hover:bg-gray-800 transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
