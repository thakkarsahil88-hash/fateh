'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredPhone } from '@/lib/usePhone'
import { createClient } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const uid = getStoredPhone() // auto-creates UUID if none exists

    async function check() {
      const supabase = createClient()

      // Ensure profile row exists
      await supabase
        .from('fateh_profiles')
        .upsert({ phone: uid }, { onConflict: 'phone', ignoreDuplicates: true })

      const { data: profile } = await supabase
        .from('fateh_profiles')
        .select('current_plan_id')
        .eq('phone', uid)
        .single()

      if (profile?.current_plan_id) {
        router.replace('/home')
      } else {
        router.replace('/onboarding')
      }
    }

    check()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
