'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredPhone } from '@/lib/usePhone'
import { createClient } from '@/lib/supabase'
import ProgressClient from './ProgressClient'
import { format, subDays } from 'date-fns'

export default function ProgressPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const phone = getStoredPhone()
    if (!phone) { router.replace('/login'); return }

    const supabase = createClient()
    const since = format(subDays(new Date(), 90), 'yyyy-MM-dd')
    const todayDate = format(new Date(), 'yyyy-MM-dd')

    async function load() {
      const [weightRes, workoutRes, logsRes] = await Promise.all([
        supabase.from('fateh_body_weight_log').select('date, weight_kg').eq('phone', phone).gte('date', since).order('date'),
        supabase.from('fateh_workout_logs').select('date').eq('phone', phone).gte('date', since).order('date'),
        supabase.from('fateh_exercise_logs')
          .select('sets, exercise_id, workout_logs:fateh_workout_logs!inner(date, phone)')
          .eq('workout_logs.phone', phone)
          .gte('workout_logs.date', since),
      ])

      setData({
        weightLog: weightRes.data ?? [],
        workoutDates: (workoutRes.data ?? []).map((w: any) => w.date),
        exerciseLogs: logsRes.data ?? [],
        todayDate,
      })
    }

    load()
  }, [router])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <ProgressClient {...data} />
}
