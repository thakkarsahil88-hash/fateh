import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProgressClient from './ProgressClient'
import { format, subDays } from 'date-fns'

export default async function ProgressPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const since = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  // Body weight history
  const { data: weightLog } = await supabase
    .from('fateh_body_weight_log')
    .select('date, weight_kg')
    .eq('user_id', user.id)
    .gte('date', since)
    .order('date')

  // Workout dates for calendar heatmap
  const { data: workoutDates } = await supabase
    .from('fateh_workout_logs')
    .select('date')
    .eq('user_id', user.id)
    .gte('date', since)
    .order('date')

  // Volume per week — get exercise logs with sets
  const { data: exerciseLogs } = await supabase
    .from('fateh_exercise_logs')
    .select('sets, exercise_id, workout_logs:fateh_workout_logs!inner(date, user_id)')
    .eq('workout_logs.user_id', user.id)
    .gte('workout_logs.date', since)

  return (
    <ProgressClient
      weightLog={weightLog ?? []}
      workoutDates={(workoutDates ?? []).map(w => w.date)}
      exerciseLogs={exerciseLogs ?? []}
      todayDate={format(new Date(), 'yyyy-MM-dd')}
    />
  )
}
