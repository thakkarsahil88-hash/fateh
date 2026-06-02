'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredExercise {
  exercise_id: string
  sets: number
  reps: string
  rest_seconds: number
  sort_order: number
}

export interface StoredPlanDay {
  id: string
  day_of_week: number
  label: string
  muscle_groups: string[]
  exercises: StoredExercise[]
}

export interface StoredPlan {
  id: string
  name: string
  split_type: string
  days_per_week: number
  duration_mins: number
  equipment: string[]
  goal: string
  days: StoredPlanDay[]
  created_at: string
}

export interface SetLog {
  reps: number
  weight_kg: number
}

export interface ExerciseLog {
  exercise_id: string
  sets: SetLog[]
}

export interface WorkoutLog {
  id: string
  date: string // YYYY-MM-DD
  plan_day_id: string
  plan_day_label: string
  duration_mins: number
  exercises: ExerciseLog[]
}

export interface WeightEntry {
  date: string
  weight_kg: number
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  plan: 'fateh_plan',
  workouts: 'fateh_workouts',
  weight: 'fateh_weight',
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export function getPlan(): StoredPlan | null {
  try {
    const raw = localStorage.getItem(KEYS.plan)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function savePlan(plan: StoredPlan) {
  localStorage.setItem(KEYS.plan, JSON.stringify(plan))
}

export function clearPlan() {
  localStorage.removeItem(KEYS.plan)
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export function getWorkouts(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(KEYS.workouts)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveWorkout(log: WorkoutLog) {
  const logs = getWorkouts().filter(w => w.date !== log.date) // one per day
  logs.push(log)
  localStorage.setItem(KEYS.workouts, JSON.stringify(logs))
}

export function getWorkoutDates(): string[] {
  return getWorkouts().map(w => w.date)
}

// ─── Body weight ──────────────────────────────────────────────────────────────

export function getWeightLog(): WeightEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.weight)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveWeight(entry: WeightEntry) {
  const log = getWeightLog().filter(w => w.date !== entry.date)
  log.push(entry)
  log.sort((a, b) => a.date.localeCompare(b.date))
  localStorage.setItem(KEYS.weight, JSON.stringify(log))
}

export function getLatestWeight(): number | null {
  const log = getWeightLog()
  return log.length ? log[log.length - 1].weight_kg : null
}
