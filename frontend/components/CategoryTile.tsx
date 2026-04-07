'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CategoryTileProps {
  title: string
  icon: LucideIcon
  value: string | number
  progress: number
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export default function CategoryTile({
  title,
  icon: Icon,
  value,
  progress,
  color,
  trend = 'neutral',
  trendValue,
}: CategoryTileProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#a1a1aa'

  return (
    <motion.div
      className="card cursor-pointer group"
      whileHover={{ y: -4 }}
      style={{
        boxShadow: `0 0 0 1px ${color}20`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: trendColor }}>
          <TrendIcon size={14} />
          {trendValue && <span>{trendValue}</span>}
        </div>
      </div>

      <h3 className="text-zinc-400 text-sm mb-1">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold" style={{ color }}>
          {value}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-[#252542] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </motion.div>
  )
}
