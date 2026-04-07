'use client'

import { motion } from 'framer-motion'
import { Dumbbell, Clock, Flame, CheckCircle2 } from 'lucide-react'

interface Exercise {
  name: string
  sets: number
  reps: number
  weight: number
  completed?: boolean
}

interface Workout {
  id: string
  date: string
  type: string
  duration: number
  exercises: Exercise[]
  caloriesBurned?: number
}

interface WorkoutCardProps {
  workout: Workout
}

export default function WorkoutCard({ workout }: WorkoutCardProps) {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{workout.type}</h3>
          <p className="text-zinc-400 text-sm">{workout.date}</p>
        </div>
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {workout.duration}min
          </span>
          {workout.caloriesBurned && (
            <span className="flex items-center gap-1 text-orange-500">
              <Flame size={14} />
              {workout.caloriesBurned} kcal
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {workout.exercises.map((exercise, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg bg-[#252542]/50"
          >
            <div className="flex items-center gap-3">
              {exercise.completed ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <Dumbbell size={16} className="text-zinc-500" />
              )}
              <span className="text-sm">{exercise.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span>{exercise.sets} sets</span>
              <span>{exercise.reps} reps</span>
              <span>{exercise.weight}kg</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
