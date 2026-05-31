export type SplitType = 'ULUL' | 'PPL' | 'full_body' | 'upper_lower' | 'push_pull'

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'glutes' | 'core' | 'cardio'

export type Equipment = 'bodyweight' | 'dumbbells' | 'resistance_bands' | 'pull_up_bar' | 'bench'

export interface Exercise {
  id: string
  name: string
  muscle_groups: MuscleGroup[]
  equipment: Equipment[]
  gif_url: string
  youtube_url: string
  default_sets: number
  default_reps: string // e.g. "8-12" or "12-15"
  instructions: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface PlanExercise {
  exercise_id: string
  exercise?: Exercise
  sets: number
  reps: string
  order: number
  rest_seconds: number
}

export interface PlanDay {
  id: string
  plan_id: string
  day_of_week: number // 0=Monday ... 6=Sunday
  label: string // e.g. "Push", "Upper", "Full Body"
  muscle_groups: MuscleGroup[]
  exercises: PlanExercise[]
}

export interface Plan {
  id: string
  user_id: string
  name: string
  split_type: SplitType
  days_per_week: number
  duration_mins: number
  equipment: Equipment[]
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss'
  created_at: string
  plan_days: PlanDay[]
}

export interface SetLog {
  reps: number
  weight_kg: number
}

export interface ExerciseLog {
  id: string
  workout_log_id: string
  exercise_id: string
  exercise?: Exercise
  sets: SetLog[]
  notes?: string
}

export interface WorkoutLog {
  id: string
  user_id: string
  plan_day_id: string
  plan_day?: PlanDay
  date: string // YYYY-MM-DD
  completed_at: string
  duration_mins: number
  exercise_logs: ExerciseLog[]
}

export interface BodyWeightEntry {
  id: string
  user_id: string
  date: string
  weight_kg: number
}

export interface Profile {
  id: string
  username: string
  display_name: string
  current_plan_id?: string
  created_at: string
}
