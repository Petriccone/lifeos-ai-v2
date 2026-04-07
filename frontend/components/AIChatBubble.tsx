'use client'

import { motion } from 'framer-motion'
import { Bot, User } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIChatBubbleProps {
  message: Message
}

export default function AIChatBubble({ message }: AIChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-purple-500' : 'bg-[#252542]'
        }`}
      >
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-purple-400" />}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] p-4 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-tr-sm'
            : 'bg-[#1a1a2e] text-zinc-100 rounded-tl-sm'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <span
          className={`text-xs mt-2 block ${isUser ? 'text-white/60' : 'text-zinc-500'}`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}
