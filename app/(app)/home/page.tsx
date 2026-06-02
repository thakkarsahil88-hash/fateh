'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlan, getCurrentDayIndex, getWorkoutDates, getLatestWeight } from '@/lib/storage'
import HomeClient from './HomeClient'
import { format } from 'date-fns'

export default function HomePage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const plan = getPlan()
    if (!plan) { router.replace('/onboarding'); return }

    const todayISO = format(new Date(), 'yyyy-MM-dd')
    const currentDayIndex = getCurrentDayIndex()
    const workoutDates = getWorkoutDates()

    setData({
      plan,
      currentDayIndex,
      alreadyWorkedOut: workoutDates.includes(todayISO),
      workoutDates,
      latestWeight: getLatestWeight(),
      todayDate: todayISO,
    })
  }, [router])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <HomeClient {...data} />
}
