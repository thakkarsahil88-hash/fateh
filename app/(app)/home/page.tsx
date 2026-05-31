import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import HomeClient from './HomeClient'
import { format } from 'date-fns'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, plans(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.current_plan_id) redirect('/onboarding')

  // Get today's day of week (0=Monday)
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7 // convert Sun=0 to Mon=0

  // Get today's plan day
  const { data: todayPlanDay } = await supabase
    .from('plan_days')
    .select('*, plan_exercises(*, )')
    .eq('plan_id', profile.current_plan_id)
    .eq('day_of_week', dayOfWeek)
    .single()

  // Get last 30 workout dates for streak/calendar
  const { data: recentWorkouts } = await supabase
    .from('workout_logs')
    .select('date')
    .eq('user_id', user.id)
    .gte('date', format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
    .order('date', { ascending: false })

  // Latest body weight
  const { data: latestWeight } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const workoutDates = recentWorkouts?.map(w => w.date) ?? []

  return (
    <HomeClient
      profile={profile}
      todayPlanDay={todayPlanDay}
      workoutDates={workoutDates}
      latestWeight={latestWeight?.weight_kg ?? null}
      todayDate={format(today, 'yyyy-MM-dd')}
    />
  )
}
