'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPlan } from '@/lib/storage'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const plan = getPlan()
    router.replace(plan ? '/home' : '/onboarding')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
