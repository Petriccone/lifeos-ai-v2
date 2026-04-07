'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface HealthGaugeProps {
  score: number
  size?: number
}

export default function HealthGauge({ score, size = 200 }: HealthGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, 300)
    return () => clearTimeout(timer)
  }, [score])

  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference

  const getColor = () => {
    if (score < 40) return '#ef4444'
    if (score < 70) return '#f97316'
    return '#22c55e'
  }

  const gradientId = `health-gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={getColor()} />
              <stop offset="100%" stopColor={score < 40 ? '#f97316' : score < 70 ? '#22c55e' : '#8b5cf6'} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 10px ${getColor()}50)`,
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {animatedScore}
          </motion.span>
          <span className="text-zinc-400 text-sm mt-1">Health Score</span>
        </div>
      </div>
    </div>
  )
}
