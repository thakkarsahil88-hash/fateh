'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPlan } from '@/lib/storage'
import PlanClient from './PlanClient'

export default function PlanPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<any>(null)

  useEffect(() => {
    const p = getPlan()
    if (!p) { router.replace('/onboarding'); return }
    setPlan(p)
  }, [router])

  if (!plan) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <PlanClient plan={plan} />
}
