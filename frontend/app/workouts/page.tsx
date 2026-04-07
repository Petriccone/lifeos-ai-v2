"use client";

import { useState } from "react";

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
    { id: "push", name: "Push Day", emoji: "💪" },
    { id: "pull", name: "Pull Day", emoji: "🏋️" },
    { id: "legs", name: "Leg Day", emoji: "🦵" },
    { id: "cardio", name: "Cardio", emoji: "🏃" },
    { id: "custom", name: "Custom", emoji: "✨" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="px-4 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <p className="text-sm text-gray-500">Track your gym sessions</p>
      </header>

      {/* Quick Stats */}
      <div className="px-4 py-6 grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a2e] rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{workouts.length}</p>
          <p className="text-xs text-gray-500">Workouts</p>
        </div>
        <div className="bg-[#1a1a2e] rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {workouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0)}
          </p>
          <p className="text-xs text-gray-500">Total mins</p>
        </div>
        <div className="bg-[#1a1a2e] rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {workouts.reduce((acc, w) => acc + w.exercises.length, 0)}
          </p>
          <p className="text-xs text-gray-500">Exercises</p>
        </div>
      </div>

      {/* Add Workout Button */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setShowAddWorkout(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="text-xl">+</span>
          <span>Log Workout</span>
        </button>
      </div>

      {/* Workout Type Selector (when adding) */}
      {showAddWorkout && (
        <div className="px-4 mb-6 bg-[#1a1a2e] rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Select Workout Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {workoutTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setNewWorkout({ ...newWorkout, workout_type: type.name })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  newWorkout.workout_type === type.name
                    ? "border-orange-500 bg-orange-500/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <span className="text-xl mb-1 block">{type.emoji}</span>
                <span className="text-sm">{type.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-400">Duration (minutes)</label>
            <input
              type="number"
              value={newWorkout.duration_minutes}
              onChange={(e) => setNewWorkout({ ...newWorkout, duration_minutes: parseInt(e.target.value) })}
              className="w-full mt-2 bg-[#0a0a0f] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowAddWorkout(false)}
              className="flex-1 py-3 rounded-xl bg-gray-800 font-medium"
            >
              Cancel
            </button>
            <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-medium">
              Save Workout
            </button>
          </div>
        </div>
      )}

      {/* Workout History */}
      <div className="px-4 space-y-4">
        <h2 className="text-lg font-semibold">Recent Workouts</h2>
        {workouts.map((workout) => (
          <div key={workout.id} className="bg-[#1a1a2e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{workout.workout_type}</h3>
                <p className="text-sm text-gray-500">{workout.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-orange-400">{workout.duration_minutes} min</p>
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              {workout.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-xs">
                    {ex.sets}x{ex.reps}
                  </div>
                  <span className="flex-1">{ex.name}</span>
                  {ex.weight_kg > 0 && (
                    <span className="text-gray-500">{ex.weight_kg}kg</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
