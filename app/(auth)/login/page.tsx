'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getStoredPhone, setStoredPhone } from '@/lib/usePhone'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  // If phone already stored, skip login
  useEffect(() => {
    const stored = getStoredPhone()
    if (stored) {
      router.replace('/home')
    } else {
      setChecking(false)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = phone.replace(/\s+/g, '').trim()
    if (!cleaned) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Create profile if doesn't exist
    const { error } = await supabase
      .from('fateh_profiles')
      .upsert({ phone: cleaned }, { onConflict: 'phone', ignoreDuplicates: true })

    if (error) {
      setError('Something went wrong. Try again.')
      setLoading(false)
      return
    }

    setStoredPhone(cleaned)

    // Check if user already has a plan
    const { data: profile } = await supabase
      .from('fateh_profiles')
      .select('current_plan_id')
      .eq('phone', cleaned)
      .single()

    if (profile?.current_plan_id) {
      router.push('/home')
    } else {
      router.push('/onboarding')
    }
  }

  if (checking) return null // brief flash while checking localStorage

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight mb-2">Fateh</h1>
          <p className="text-zinc-400">Your home gym, tracked.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-zinc-900 rounded-2xl p-5 space-y-4">
            <p className="text-sm text-zinc-400 text-center">
              Enter your phone number to get started
            </p>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-lg tracking-wide"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-base"
            >
              {loading ? 'Loading…' : 'Continue →'}
            </button>
          </div>
          <p className="text-center text-zinc-600 text-xs px-4">
            This is your personal identifier. Anyone with your number can view your data.
          </p>
        </form>
      </div>
    </div>
  )
}
