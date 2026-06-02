'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlan, getCurrentDayIndex } from '@/lib/storage'
import WorkoutClient from './WorkoutClient'
import { format } from 'date-fns'

export default function WorkoutPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const plan = getPlan()
    if (!plan) { router.replace('/onboarding'); return }
    const currentDayIndex = getCurrentDayIndex()
    const planDay = plan.days[currentDayIndex % plan.days.length]
    setData({ plan, planDay, currentDayIndex, todayDate: format(new Date(), 'yyyy-MM-dd') })
  }, [router])

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <WorkoutClient {...data} />
}
