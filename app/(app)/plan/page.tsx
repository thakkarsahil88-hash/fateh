import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PlanClient from './PlanClient'

export default async function PlanPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('fateh_profiles')
    .select('current_plan_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_plan_id) redirect('/onboarding')

  const { data: plan } = await supabase
    .from('fateh_plans')
    .select('*')
    .eq('id', profile.current_plan_id)
    .single()

  const { data: planDays } = await supabase
    .from('fateh_plan_days')
    .select('*, plan_exercises:fateh_plan_exercises(exercise_id, sets, reps, rest_seconds, sort_order)')
    .eq('plan_id', profile.current_plan_id)
    .order('sort_order')

  return <PlanClient plan={plan} planDays={planDays ?? []} />
}
