'use client'

import { useEffect, useState } from 'react'
import { getWorkouts, getWeightLog, getWorkoutDates } from '@/lib/storage'
import ProgressClient from './ProgressClient'
import { format } from 'date-fns'

export default function ProgressPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    setData({
      weightLog: getWeightLog(),
      workoutDates: getWorkoutDates(),
      workouts: getWorkouts(),
      todayDate: format(new Date(), 'yyyy-MM-dd'),
    })
  }, [])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <ProgressClient {...data} />
}
