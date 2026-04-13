"use client";

import { Dumbbell, Clock, ChevronRight, Flame } from "lucide-react";
import type { WorkoutGeneratedFromChat } from "@/lib/types";

function iconForType(type?: string | null): string {
  const lower = (type || "").toLowerCase();
  if (lower.includes("push")) return "\uD83D\uDCAA";
  if (lower.includes("pull")) return "\uD83C\uDFCB\uFE0F";
  if (lower.includes("leg")) return "\uD83E\uDDB5";
  if (lower.includes("full")) return "\uD83D\uDD25";
  if (lower.includes("cardio")) return "\uD83C\uDFC3";
  return "\u2728";
}

export default function WorkoutChatCard({
  workout,
}: {
  workout: WorkoutGeneratedFromChat;
}) {
  const totalSets = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );
  const totalVolume = workout.exercises.reduce(
    (acc, ex) =>
      acc + ex.sets.reduce((s, st) => s + st.reps * st.weight, 0),
    0
  );

  return (
    <div className="mt-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{iconForType(workout.workout_type)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">
              {workout.name}
            </h4>
            <div className="flex items-center gap-3 text-[10px] text-indigo-300 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {workout.duration_minutes}min
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3 h-3" />
                {workout.exercises.length} exercises
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {totalSets} sets
              </span>
              {totalVolume > 0 && (
                <span className="text-indigo-400">
                  {(totalVolume / 1000).toFixed(1)}t vol
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-4 py-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
        {workout.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-indigo-400 font-mono w-4 text-right text-[10px]">
                {i + 1}
              </span>
              <span className="text-gray-200 truncate">{ex.name}</span>
              {ex.muscle_group && (
                <span className="text-[9px] text-gray-500 uppercase tracking-wider hidden sm:inline">
                  {ex.muscle_group}
                </span>
              )}
            </div>
            <span className="text-gray-400 whitespace-nowrap ml-2 text-[11px]">
              {ex.sets.length}x{ex.sets[0]?.reps || 0}
              {ex.sets[0]?.weight ? ` @ ${ex.sets[0].weight}kg` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Footer with link */}
      <a
        href={`/workouts?expand=${workout.id}`}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border-t border-white/5 transition-colors group"
      >
        <span className="text-xs font-medium text-indigo-300 group-hover:text-indigo-200">
          Ver treino completo
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
      </a>
    </div>
  );
}
