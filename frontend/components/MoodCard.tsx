'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface MoodCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: string
  invert?: boolean
}

export default function MoodCard({ title, value, icon: Icon, color, invert = false }: MoodCardProps) {
  const displayValue = invert ? 100 - value : value
  const circumference = 2 * Math.PI * 26
  const strokeDashoffset = circumference - (displayValue / 100) * circumference

  return (
    <motion.div
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] transition-all cursor-default"
      whileHover={{ scale: 1.05 }}
    >
      <div className="relative w-16 h-16">
        <svg width="64" height="64" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#252542"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <motion.circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 6px ${color}50)`,
            }}
          />
        </svg>
        {/* Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <div className="text-center">
        <span className="text-xs text-zinc-400 block">{title}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {value}%
        </span>
      </div>
    </motion.div>
  )
}
