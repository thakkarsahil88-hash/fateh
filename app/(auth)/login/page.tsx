'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Step = 'enter_email' | 'check_email'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('enter_email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setStep('check_email')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight mb-2">Fateh</h1>
          <p className="text-zinc-400">Your home gym, tracked.</p>
        </div>

        {step === 'enter_email' && (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-5 space-y-4">
              <p className="text-sm text-zinc-400 text-center">
                Enter your email — we'll send you a login link. No password needed.
              </p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Sending…' : 'Send Login Link'}
              </button>
            </div>
          </form>
        )}

        {step === 'check_email' && (
          <div className="bg-zinc-900 rounded-2xl p-6 text-center space-y-4">
            <div className="text-5xl">📬</div>
            <h2 className="text-lg font-semibold">Check your inbox</h2>
            <p className="text-zinc-400 text-sm">
              We sent a login link to <span className="text-white font-medium">{email}</span>.
              <br />Tap the link to sign in.
            </p>
            <button
              onClick={() => { setStep('enter_email'); setError('') }}
              className="text-sm text-zinc-500 hover:text-zinc-300 underline"
            >
              Use a different email
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
