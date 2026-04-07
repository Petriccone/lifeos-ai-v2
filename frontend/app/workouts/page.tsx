"use client";

import { useState } from "react";
import { Dumbbell, Plus, Clock, Activity, Target, Zap } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
}

interface Workout {
  id: string;
  date: string;
  workout_type: string;
  duration_minutes: number;
  exercises: Exercise[];
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([
    {
      id: "1",
      date: "2026-04-07",
      workout_type: "Push Day",
      duration_minutes: 65,
      exercises: [
        { id: "1", name: "Bench Press", sets: 4, reps: 10, weight_kg: 60 },
        { id: "2", name: "Shoulder Press", sets: 3, reps: 12, weight_kg: 40 },
        { id: "3", name: "Tricep Dips", sets: 3, reps: 15, weight_kg: 0 },
      ],
    },
    {
      id: "2",
      date: "2026-04-05",
      workout_type: "Pull Day",
      duration_minutes: 55,
      exercises: [
        { id: "4", name: "Deadlift", sets: 4, reps: 8, weight_kg: 100 },
        { id: "5", name: "Pull-ups", sets: 3, reps: 10, weight_kg: 10 },
        { id: "6", name: "Barbell Rows", sets: 3, reps: 12, weight_kg: 50 },
      ],
    },
  ]);

  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [newWorkout, setNewWorkout] = useState({
    workout_type: "",
    duration_minutes: 60,
    exercises: [] as Exercise[],
  });

  const workoutTypes = [
    { id: "push", name: "Push Day", icon: "💪" },
    { id: "pull", name: "Pull Day", icon: "🏋️" },
    { id: "legs", name: "Leg Day", icon: "🦵" },
    { id: "cardio", name: "Cardio", icon: "🏃" },
    { id: "custom", name: "Custom", icon: "✨" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-32 md:pb-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
           <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Dumbbell className="w-6 h-6 text-white" />
           </div>
           <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Workouts</h1>
              <p className="text-sm text-gray-400">Track and optimize your physical progress.</p>
           </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Target className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{workouts.length}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Sessions</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">
            {workouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Minutes</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Activity className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">
            {workouts.reduce((acc, w) => acc + w.exercises.length, 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Exercises</p>
        </div>
      </div>

      {/* Primary Action */}
      {!showAddWorkout && (
         <button
            onClick={() => setShowAddWorkout(true)}
            className="w-full py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] group"
         >
            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-full p-1 group-hover:scale-110 transition-transform text-black">
               <Plus className="w-4 h-4" />
            </div>
            <span>Log New Session</span>
         </button>
      )}

      {/* Add Workout Form (Glassmorphic) */}
      {showAddWorkout && (
        <div className="glass-panel rounded-3xl p-6 md:p-8 animate-fadeIn border-t border-l border-white/10 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-orange-400" /> Select Routine</h3>
             <button onClick={() => setShowAddWorkout(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {workoutTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setNewWorkout({ ...newWorkout, workout_type: type.name })}
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  newWorkout.workout_type === type.name
                    ? "border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-3xl mb-2 flex justify-center">{type.icon}</span>
                <span className={`text-sm font-medium ${newWorkout.workout_type === type.name ? 'text-orange-400' : 'text-gray-300'}`}>{type.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-8">
             <label className="text-sm text-gray-400 font-medium ml-1">Duration (minutes)</label>
             <div className="relative mt-2">
                <Clock className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 transform -translate-y-1/2" />
                <input
                  type="number"
                  value={newWorkout.duration_minutes}
                  onChange={(e) => setNewWorkout({ ...newWorkout, duration_minutes: parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-orange-500 focus:bg-black/60 transition-colors text-white"
                />
             </div>
          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
            <button
              onClick={() => setShowAddWorkout(false)}
              className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-medium transition-colors"
            >
              Cancel
            </button>
            <button className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5">
              Save Session
            </button>
          </div>
        </div>
      )}

      {/* Workout History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white/90">Recent Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {workouts.map((workout) => (
             <div key={workout.id} className="glass-card hover:bg-white/[0.03] p-6 !rounded-3xl border border-white/5 group">
               <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                       {workout.workout_type.includes('Push') ? '💪' : workout.workout_type.includes('Pull') ? '🏋️' : '🏃'}
                    </div>
                    <div>
                       <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">{workout.workout_type}</h3>
                       <p className="text-xs text-gray-500">{workout.date}</p>
                    </div>
                 </div>
                 <div className="text-right flex flex-col items-end">
                   <p className="text-sm font-medium text-orange-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {workout.duration_minutes} min</p>
                 </div>
               </div>

               {/* Exercises */}
               <div className="space-y-3">
                 {workout.exercises.map((ex) => (
                   <div key={ex.id} className="flex items-center gap-3 text-sm group/item">
                     <div className="w-12 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-[11px] font-mono text-gray-400">
                       {ex.sets}x{ex.reps}
                     </div>
                     <span className="flex-1 text-gray-300 group-hover/item:text-white transition-colors">{ex.name}</span>
                     {ex.weight_kg > 0 && (
                       <span className="text-gray-500 text-xs font-mono">{ex.weight_kg}kg</span>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
