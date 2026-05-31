import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import WorkoutClient from './WorkoutClient'
import { format } from 'date-fns'

export default async function WorkoutPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('fateh_profiles')
    .select('current_plan_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_plan_id) redirect('/onboarding')

  const dayOfWeek = (new Date().getDay() + 6) % 7

  const { data: planDay } = await supabase
    .from('fateh_plan_days')
    .select('*, plan_exercises:fateh_plan_exercises(exercise_id, sets, reps, rest_seconds, sort_order)')
    .eq('plan_id', profile.current_plan_id)
    .eq('day_of_week', dayOfWeek)
    .single()

  return (
    <WorkoutClient
      userId={user.id}
      planDay={planDay}
      todayDate={format(new Date(), 'yyyy-MM-dd')}
    />
  )
}
