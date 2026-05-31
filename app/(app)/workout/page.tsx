'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredPhone } from '@/lib/usePhone'
import { createClient } from '@/lib/supabase'
import WorkoutClient from './WorkoutClient'
import { format } from 'date-fns'

export default function WorkoutPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const phone = getStoredPhone()
    if (!phone) { router.replace('/login'); return }

    const supabase = createClient()
    const today = new Date()
    const dayOfWeek = (today.getDay() + 6) % 7

    async function load() {
      const { data: profile } = await supabase
        .from('fateh_profiles')
        .select('current_plan_id')
        .eq('phone', phone)
        .single()

      if (!profile?.current_plan_id) { router.replace('/onboarding'); return }

      const { data: planDay } = await supabase
        .from('fateh_plan_days')
        .select('*, plan_exercises:fateh_plan_exercises(exercise_id, sets, reps, rest_seconds, sort_order)')
        .eq('plan_id', profile.current_plan_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      setData({ phone, planDay, todayDate: format(today, 'yyyy-MM-dd') })
    }

    load()
  }, [router])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <WorkoutClient {...data} />
}
