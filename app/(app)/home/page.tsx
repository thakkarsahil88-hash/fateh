'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredPhone } from '@/lib/usePhone'
import { createClient } from '@/lib/supabase'
import HomeClient from './HomeClient'
import { format } from 'date-fns'

export default function HomePage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const phone = getStoredPhone()
    if (!phone) { router.replace('/login'); return }

    const supabase = createClient()
    const today = new Date()
    const todayISO = format(today, 'yyyy-MM-dd')
    const dayOfWeek = (today.getDay() + 6) % 7

    async function load() {
      const { data: profile } = await supabase
        .from('fateh_profiles')
        .select('*, fateh_plans(*)')
        .eq('phone', phone)
        .single()

      if (!profile?.current_plan_id) { router.replace('/onboarding'); return }

      const { data: todayPlanDay } = await supabase
        .from('fateh_plan_days')
        .select('*, plan_exercises:fateh_plan_exercises(*)')
        .eq('plan_id', profile.current_plan_id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      const { data: recentWorkouts } = await supabase
        .from('fateh_workout_logs')
        .select('date')
        .eq('phone', phone)
        .gte('date', format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
        .order('date', { ascending: false })

      const { data: latestWeight } = await supabase
        .from('fateh_body_weight_log')
        .select('weight_kg')
        .eq('phone', phone)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      setData({
        profile,
        todayPlanDay,
        workoutDates: recentWorkouts?.map((w: any) => w.date) ?? [],
        latestWeight: latestWeight?.weight_kg ?? null,
        todayDate: todayISO,
        phone,
      })
    }

    load()
  }, [router])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <HomeClient {...data} />
}
