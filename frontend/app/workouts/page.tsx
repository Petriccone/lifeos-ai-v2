"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Dumbbell,
  Plus,
  Clock,
  Zap,
  AlertCircle,
  X,
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  Trophy,
  Flame,
  Sparkles,
  Loader2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  Exercise,
  Workout,
  WorkoutExerciseEntry,
  WorkoutSet,
  WorkoutGoal,
  WorkoutLevel,
  AiWorkoutResponse,
} from "@/lib/types";

interface DraftExercise {
  clientId: string;
  exercise_id: string;
  name: string;
  muscle_group?: string | null;
  sets: WorkoutSet[];
}

const WORKOUT_TYPES = [
  { id: "push", name: "Push", icon: "💪" },
  { id: "pull", name: "Pull", icon: "🏋️" },
  { id: "legs", name: "Legs", icon: "🦵" },
  { id: "full_body", name: "Full Body", icon: "🔥" },
  { id: "cardio", name: "Cardio", icon: "🏃" },
  { id: "custom", name: "Custom", icon: "✨" },
] as const;

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function iconForType(type?: string | null): string {
  const lower = (type || "").toLowerCase();
  if (lower.includes("push")) return "💪";
  if (lower.includes("pull")) return "🏋️";
  if (lower.includes("leg")) return "🦵";
  if (lower.includes("full")) return "🔥";
  if (lower.includes("cardio") || lower.includes("run")) return "🏃";
  return "✨";
}

function totalVolume(exercises: WorkoutExerciseEntry[] | undefined): number {
  if (!exercises) return 0;
  return exercises.reduce((acc, ex) => {
    const vol = (ex.sets || []).reduce((s, st) => s + (st.weight || 0) * (st.reps || 0), 0);
    return acc + vol;
  }, 0);
}

function draftVolume(exercises: DraftExercise[]): number {
  return exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((s, st) => s + (st.weight || 0) * (st.reps || 0), 0);
  }, 0);
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workoutType, setWorkoutType] = useState<string>("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState<number>(60);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const [aiOpen, setAiOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGoal, setAiGoal] = useState<WorkoutGoal>("hypertrophy");
  const [aiLevel, setAiLevel] = useState<WorkoutLevel>("intermediate");
  const [aiEquipment, setAiEquipment] = useState<string[]>([
    "barbell",
    "dumbbell",
    "machine",
    "bodyweight",
    "cable",
  ]);
  const [aiExtraNotes, setAiExtraNotes] = useState("");

  const loadWorkouts = useCallback(async (cancelledRef: { current: boolean }) => {
    try {
      const list = await api.workouts.list(30);
      if (cancelledRef.current) return;
      setWorkouts(list);
    } catch (err) {
      if (cancelledRef.current) return;
      if (err instanceof ApiError && err.status === 401) return;
      setError("Could not load workouts.");
    }
  }, []);

  const loadLibrary = useCallback(async (cancelledRef: { current: boolean }) => {
    try {
      const list = await api.exercises.list();
      if (cancelledRef.current) return;
      setExerciseLibrary(list);
    } catch (err) {
      if (cancelledRef.current) return;
      console.error("exercise library load failed", err);
    }
  }, []);

  const searchParams = useSearchParams();
  const expandFromChat = searchParams.get("expand");

  useEffect(() => {
    const cancelledRef = { current: false };
    setLoading(true);
    Promise.all([loadWorkouts(cancelledRef), loadLibrary(cancelledRef)]).finally(() => {
      if (!cancelledRef.current) setLoading(false);
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [loadWorkouts, loadLibrary]);

  // Auto-expand workout when navigating from chat with ?expand=id
  useEffect(() => {
    if (expandFromChat && !loading && workouts.length > 0) {
      setExpandedId(expandFromChat);
      // Scroll the expanded card into view after DOM update
      requestAnimationFrame(() => {
        const el = document.getElementById(`workout-card-${expandFromChat}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }, [expandFromChat, loading, workouts]);

  const [detailsCache, setDetailsCache] = useState<Record<string, Workout>>({});
  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailsCache[id]) {
      try {
        const detail = await api.workouts.get(id);
        setDetailsCache((c) => ({ ...c, [id]: detail }));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError("Could not load workout detail.");
      }
    }
  };

  const resetComposer = () => {
    setWorkoutType("");
    setWorkoutNotes("");
    setWorkoutDuration(60);
    setDraftExercises([]);
    setPickerOpen(false);
    setPickerQuery("");
  };

  const openComposer = () => {
    resetComposer();
    setComposerOpen(true);
  };

  const cancelComposer = () => {
    resetComposer();
    setComposerOpen(false);
  };

  const addDraftExercise = (ex: Exercise) => {
    const clientId = `${ex.id}-${Date.now()}`;
    setDraftExercises((prev) => [
      ...prev,
      {
        clientId,
        exercise_id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        sets: [{ reps: 10, weight: 0 }],
      },
    ]);
    setPickerOpen(false);
    setPickerQuery("");
  };

  const removeDraftExercise = (clientId: string) => {
    setDraftExercises((prev) => prev.filter((e) => e.clientId !== clientId));
  };

  const addSet = (clientId: string) => {
    setDraftExercises((prev) =>
      prev.map((e) => {
        if (e.clientId !== clientId) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [...e.sets, { reps: last?.reps ?? 10, weight: last?.weight ?? 0 }],
        };
      })
    );
  };

  const removeSet = (clientId: string, index: number) => {
    setDraftExercises((prev) =>
      prev.map((e) => {
        if (e.clientId !== clientId) return e;
        return { ...e, sets: e.sets.filter((_, i) => i !== index) };
      })
    );
  };

  const updateSet = (clientId: string, index: number, field: "reps" | "weight", value: number) => {
    setDraftExercises((prev) =>
      prev.map((e) => {
        if (e.clientId !== clientId) return e;
        return {
          ...e,
          sets: e.sets.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
        };
      })
    );
  };

  const toggleAiEquipment = (item: string) => {
    setAiEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleAiGenerate = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const result: AiWorkoutResponse = await api.workouts.aiGenerate({
        goal: aiGoal,
        level: aiLevel,
        duration_minutes: workoutDuration || 60,
        workout_type: workoutType || "push",
        equipment: aiEquipment.length > 0 ? aiEquipment : ["barbell", "dumbbell", "bodyweight"],
        notes: aiExtraNotes || undefined,
      });

      const drafts: DraftExercise[] = result.exercises
        .filter((e) => !!e.exercise_id)
        .map((e, i) => ({
          clientId: `ai-${Date.now()}-${i}`,
          exercise_id: e.exercise_id as string,
          name: e.name,
          muscle_group: e.muscle_group ?? null,
          sets: e.sets.map((s) => ({ reps: s.reps, weight: s.weight, rpe: s.rpe })),
        }));

      if (drafts.length === 0) {
        setAiError("AI returned no matchable exercises. Try different equipment or type.");
        return;
      }

      setDraftExercises(drafts);
      if (result.workout_type && !workoutType) setWorkoutType(result.workout_type);
      if (result.duration_minutes) setWorkoutDuration(result.duration_minutes);
      if (result.notes) setWorkoutNotes(result.notes);
      setAiOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail =
          typeof err.body === "object" && err.body !== null && "detail" in err.body
            ? String((err.body as { detail: unknown }).detail)
            : `Failed (${err.status})`;
        setAiError(detail);
      } else {
        setAiError("Could not reach AI service.");
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!workoutType || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.workouts.create({
        workout_type: workoutType,
        duration_minutes: workoutDuration,
        notes: workoutNotes || undefined,
        exercises: draftExercises.map((e) => ({ exercise_id: e.exercise_id, sets: e.sets })),
      });
      cancelComposer();
      const cancelledRef = { current: false };
      await loadWorkouts(cancelledRef);
    } catch (err) {
      if (err instanceof ApiError) setError(`Failed to save workout (${err.status}).`);
      else setError("Failed to save workout.");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const sessions = workouts.length;
    const minutes = workouts.reduce((a, w) => a + (w.duration_minutes || 0), 0);
    return { sessions, minutes };
  }, [workouts]);

  const filteredLibrary = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return exerciseLibrary;
    return exerciseLibrary.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.muscle_group || "").toLowerCase().includes(q)
    );
  }, [exerciseLibrary, pickerQuery]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Dumbbell className="w-8 h-8 text-orange-400" />
          <p className="text-white/50 text-sm">Loading workouts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-3xl mx-auto">
      {error && (
        <div className="glass-panel border-red-500/50 bg-red-500/10 flex items-start gap-3 p-4 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-200 font-medium">Error</p>
            <p className="text-xs text-red-300 mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{totals.sessions}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Sessions</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{totals.minutes}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Minutes</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">{exerciseLibrary.length}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Exercises</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 text-center shadow-sm">
          <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <p className="text-3xl font-bold text-white">
            {Math.round(workouts.reduce((a, w) => a + totalVolume(w.exercises), 0)).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">kg Volume</p>
        </div>
      </div>

      {!composerOpen && (
        <button
          onClick={openComposer}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Start New Workout
        </button>
      )}

      {composerOpen && (
        <div className="glass-panel rounded-3xl p-6 md:p-8 animate-fadeIn border-t border-l border-white/10 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" /> New Session
            </h3>
            <button onClick={cancelComposer} aria-label="Close composer" className="text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {WORKOUT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setWorkoutType(type.name)}
                className={`p-3 rounded-2xl border transition-all duration-300 ${
                  workoutType === type.name
                    ? "border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-2xl mb-1 flex justify-center">{type.icon}</span>
                <p className="text-[10px] font-medium text-white">{type.name}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                Duration (minutes)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(parseInt(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-orange-500 focus:bg-black/60 transition-colors text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                Notes (optional)
              </label>
              <textarea
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                rows={2}
                placeholder="E.g. Focus on form, light weight, recovery session…"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:bg-black/60 transition-colors text-white text-sm resize-none"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Exercises ({draftExercises.length})
              </p>
              <span className="text-xs text-gray-500">{draftVolume(draftExercises).toLocaleString()} kg</span>
            </div>

            {draftExercises.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No exercises yet. Add from library or use AI.</p>
            ) : (
              <div className="space-y-2">
                {draftExercises.map((ex) => (
                  <div key={ex.clientId} className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">
                        {ex.name}
                        {ex.muscle_group && <span className="text-[10px] text-gray-500 ml-2">({ex.muscle_group})</span>}
                      </p>
                      <button
                        onClick={() => removeDraftExercise(ex.clientId)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {ex.sets.map((set, si) => (
                        <div
                          key={si}
                          className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1 border border-white/10"
                        >
                          <input
                            type="number"
                            min={1}
                            value={set.reps}
                            onChange={(e) => updateSet(ex.clientId, si, "reps", parseInt(e.target.value) || 0)}
                            className="w-8 bg-transparent text-white text-xs focus:outline-none text-center"
                          />
                          <span className="text-gray-500 text-xs">×</span>
                          <input
                            type="number"
                            min={0}
                            value={set.weight}
                            onChange={(e) => updateSet(ex.clientId, si, "weight", parseInt(e.target.value) || 0)}
                            className="w-10 bg-transparent text-white text-xs focus:outline-none text-center"
                          />
                          <span className="text-gray-500 text-xs">kg</span>
                          <button onClick={() => removeSet(ex.clientId, si)} className="ml-1 text-gray-600 hover:text-red-400">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addSet(ex.clientId)}
                      className="text-[11px] px-2 py-1 text-orange-400 hover:text-orange-300 border border-orange-400/30 rounded-lg hover:bg-orange-400/5 transition-colors"
                    >
                      + Set
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPickerOpen(true)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> From Library
              </button>
              <button
                onClick={() => setAiOpen(true)}
                className="flex-1 py-2 rounded-lg border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> AI Generate
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={cancelComposer}
              className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!workoutType || saving}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Session"}
            </button>
          </div>
        </div>
      )}

      {aiOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-md"
          onClick={() => !aiGenerating && setAiOpen(false)}
        >
          <div
            className="w-full md:w-[520px] bg-[#0c0c10] md:border border-white/10 md:rounded-3xl max-h-[90vh] overflow-y-auto hidden-scrollbar flex flex-col shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-300" /> AI Workout Generator
              </h3>
              <button
                onClick={() => !aiGenerating && setAiOpen(false)}
                aria-label="Close AI generator"
                disabled={aiGenerating}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Goal</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "hypertrophy", label: "Hypertrophy" },
                    { id: "strength", label: "Strength" },
                    { id: "fat_loss", label: "Fat loss" },
                    { id: "endurance", label: "Endurance" },
                  ] as Array<{ id: WorkoutGoal; label: string }>).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setAiGoal(g.id)}
                      className={`py-2.5 rounded-xl border text-sm transition-all ${
                        aiGoal === g.id
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300 font-medium"
                          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "beginner", label: "Beginner" },
                    { id: "intermediate", label: "Intermediate" },
                    { id: "advanced", label: "Advanced" },
                  ] as Array<{ id: WorkoutLevel; label: string }>).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setAiLevel(l.id)}
                      className={`py-2.5 rounded-xl border text-sm transition-all ${
                        aiLevel === l.id
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300 font-medium"
                          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Equipment available
                </label>
                <div className="flex flex-wrap gap-2">
                  {["barbell", "dumbbell", "machine", "cable", "bodyweight"].map((eq) => {
                    const active = aiEquipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        onClick={() => toggleAiEquipment(eq)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          active
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        {eq}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                  Extra context (optional)
                </label>
                <textarea
                  value={aiExtraNotes}
                  onChange={(e) => setAiExtraNotes(e.target.value)}
                  rows={2}
                  placeholder="E.g. Knee injury, no overhead pressing, prefer supersets…"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 text-white resize-none text-sm"
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Using workout type:{" "}
                <span className="text-gray-300 font-medium">{workoutType || "Push (default)"}</span> · duration:{" "}
                <span className="text-gray-300 font-medium">{workoutDuration} min</span>
              </p>

              {aiError && (
                <div className="flex items-start gap-2 text-xs text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>{aiError}</div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/5 flex gap-3 sticky bottom-0 bg-[#0c0c10]">
              <button
                onClick={() => !aiGenerating && setAiOpen(false)}
                disabled={aiGenerating}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating || aiEquipment.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate workout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full md:w-[520px] bg-[#0c0c10] md:border border-white/10 md:rounded-3xl h-[85vh] md:h-[600px] flex flex-col shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-orange-400" /> Pick an exercise
              </h3>
              <button
                onClick={() => setPickerOpen(false)}
                aria-label="Close picker"
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search by name or muscle group…"
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto hidden-scrollbar">
              {filteredLibrary.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No exercises found.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredLibrary.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addDraftExercise(ex)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{ex.name}</p>
                        <p className="text-[11px] text-gray-500 uppercase mt-0.5">
                          {ex.muscle_group || "—"}
                          {ex.equipment && ` · ${ex.equipment}`}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-orange-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {workouts.length === 0 && !composerOpen ? (
        <div className="glass-panel rounded-3xl p-10 text-center">
          <Dumbbell className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">No workouts yet</p>
          <p className="text-sm text-gray-400 mb-4">Log your first session to start tracking progress.</p>
          <button
            onClick={openComposer}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white text-sm font-medium"
          >
            Start a workout
          </button>
        </div>
      ) : workouts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/90">Recent Sessions</h2>
          <div className="space-y-3">
            {workouts.map((w) => {
              const isExpanded = expandedId === w.id;
              const isFromChat = expandFromChat === w.id;
              const detail = detailsCache[w.id];
              const displayType = w.workout_type || "Workout";
              return (
                <div key={w.id} id={`workout-card-${w.id}`} className={`glass-card p-5 rounded-2xl border ${isFromChat ? "border-indigo-500/50 ring-1 ring-indigo-500/30 animate-pulse-once" : "border-white/5"}`}>
                  <button
                    onClick={() => handleExpand(w.id)}
                    className="w-full flex items-center justify-between text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">
                        {iconForType(displayType)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{displayType}</p>
                        <p className="text-xs text-gray-500">{formatDate(w.started_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {w.duration_minutes ? (
                        <span className="text-xs text-orange-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {w.duration_minutes}m
                        </span>
                      ) : null}
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      {detail ? (
                        <>
                          {detail.exercises && detail.exercises.length > 0 ? (
                            <>
                              <div className="flex items-center justify-between text-[11px] uppercase text-gray-500 tracking-wider">
                                <span>
                                  {detail.exercises.length} exercise{detail.exercises.length > 1 ? "s" : ""}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3" /> {Math.round(totalVolume(detail.exercises)).toLocaleString()} kg volume
                                </span>
                              </div>
                              {detail.exercises.map((ex, i) => (
                                <div key={i} className="bg-black/20 rounded-xl p-3 border border-white/5">
                                  <p className="text-sm font-medium text-white mb-2">{ex.name || "Exercise"}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {(ex.sets || []).map((set, si) => (
                                      <span key={si} className="text-[11px] px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300">
                                        {set.reps}×{set.weight}kg
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">No exercises logged in this session.</p>
                          )}
                          {detail.notes && (
                            <p className="text-sm text-gray-400 italic pt-2 border-t border-white/5">&quot;{detail.notes}&quot;</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 animate-pulse">Loading detail…</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
