import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_plan_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_plan_id) redirect('/onboarding')

  redirect('/home')
}
