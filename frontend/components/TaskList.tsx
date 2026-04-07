'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Flame } from 'lucide-react'

interface Task {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
}

interface TaskListProps {
  tasks?: Task[]
}

export default function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(
    initialTasks || [
      { id: '1', text: 'Morning meditation session', completed: false, priority: 'high' },
      { id: '2', text: 'Review weekly goals', completed: false, priority: 'medium' },
      { id: '3', text: 'Gym workout - Upper body', completed: true, priority: 'high' },
      { id: '4', text: 'Call mom', completed: false, priority: 'low' },
      { id: '5', text: 'Read 20 pages', completed: false, priority: 'medium' },
    ]
  )
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  const addTask = () => {
    if (!newTask.trim()) return
    setTasks([
      ...tasks,
      {
        id: Date.now().toString(),
        text: newTask,
        completed: false,
        priority,
      },
    ])
    setNewTask('')
  }

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id))
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high':
        return '#ef4444'
      case 'medium':
        return '#f97316'
      default:
        return '#22c55e'
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="space-y-4">
      {/* Add task form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          className="bg-[#252542] px-3 rounded-lg text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button onClick={addTask} className="btn-primary px-4">
          <Plus size={18} />
        </button>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-center gap-3 p-3 rounded-lg bg-[#1a1a2e]/50 group transition-all hover:bg-[#1a1a2e] ${
                task.completed ? 'opacity-60' : ''
              }`}
            >
              <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                {task.completed ? (
                  <CheckCircle2 size={20} className="text-green-500" />
                ) : (
                  <Circle size={20} className="text-zinc-500" />
                )}
              </button>

              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getPriorityColor(task.priority) }}
              />

              <span className={`flex-1 text-sm ${task.completed ? 'line-through text-zinc-500' : ''}`}>
                {task.text}
              </span>

              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            <Flame size={40} className="mx-auto mb-2 text-orange-500" />
            <p>All clear! You're on fire 🔥</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-zinc-400 pt-2 border-t border-[#252542]">
        <span>{completedCount} of {tasks.length} completed</span>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-orange-500" />
          <span>{tasks.filter((t) => !t.completed && t.priority === 'high').length} high priority</span>
        </div>
      </div>
    </div>
  )
}
