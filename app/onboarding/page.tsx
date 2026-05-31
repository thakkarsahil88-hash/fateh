'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SplitType, Equipment } from '@/lib/types'

type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss'

interface OnboardingData {
  days_per_week: number
  split_type: SplitType
  duration_mins: number
  equipment: Equipment[]
  goal: Goal
}

const STEPS = ['days', 'split', 'duration', 'equipment', 'goal'] as const

const SPLITS: { value: SplitType; label: string; desc: string }[] = [
  { value: 'full_body', label: 'Full Body', desc: 'All muscles every session — great for 2–3 days/week' },
  { value: 'upper_lower', label: 'Upper / Lower', desc: 'Alternate upper and lower body — 4 days/week' },
  { value: 'ULUL', label: 'ULUL', desc: 'Upper-Lower-Upper-Lower cycle — 4 days/week' },
  { value: 'PPL', label: 'Push / Pull / Legs', desc: 'Classic 3-day or 6-day split' },
  { value: 'push_pull', label: 'Push / Pull', desc: 'Upper push and pull alternating — 4 days/week' },
]

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; emoji: string }[] = [
  { value: 'bodyweight', label: 'Bodyweight', emoji: '🤸' },
  { value: 'dumbbells', label: 'Dumbbells', emoji: '🏋️' },
  { value: 'resistance_bands', label: 'Resistance Bands', emoji: '🎗️' },
  { value: 'pull_up_bar', label: 'Pull-Up Bar', emoji: '🔝' },
  { value: 'bench', label: 'Bench / Chair', emoji: '🪑' },
]

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: 'strength', label: 'Strength', desc: 'Get stronger — low reps, heavy weight' },
  { value: 'hypertrophy', label: 'Muscle Growth', desc: 'Build size — moderate reps, progressive overload' },
  { value: 'endurance', label: 'Endurance', desc: 'Increase stamina — high reps, circuit style' },
  { value: 'fat_loss', label: 'Fat Loss', desc: 'Burn fat — high intensity, short rest' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    days_per_week: 3,
    split_type: 'full_body',
    duration_mins: 45,
    equipment: ['bodyweight'],
    goal: 'hypertrophy',
  })

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function back() { setStep(s => Math.max(s - 1, 0)) }

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const { getStoredPhone } = await import('@/lib/usePhone')
      const phone = getStoredPhone()
      if (!phone) { window.location.href = '/login'; return }
      const res = await fetch('/api/plan-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, phone }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to generate plan')
      }
      router.push('/home')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-orange-500' : 'bg-zinc-800'
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {/* Step 0 — days */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">How many days per week?</h2>
              <p className="text-zinc-400 mb-8">Be realistic — consistency beats perfection.</p>
              <div className="flex gap-3 flex-wrap">
                {[2, 3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    onClick={() => setData(prev => ({ ...prev, days_per_week: d }))}
                    className={cn(
                      'w-16 h-16 rounded-2xl text-xl font-bold transition-all',
                      data.days_per_week === d
                        ? 'bg-orange-500 text-white'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — split */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose your split</h2>
              <p className="text-zinc-400 mb-6">How do you want to structure your week?</p>
              <div className="space-y-3">
                {SPLITS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setData(prev => ({ ...prev, split_type: s.value }))}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-all',
                      data.split_type === s.value
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-sm text-zinc-400">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — duration */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Time per session?</h2>
              <p className="text-zinc-400 mb-8">We'll fit the right number of exercises in.</p>
              <div className="flex gap-3 flex-wrap">
                {[20, 30, 45, 60, 90].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setData(prev => ({ ...prev, duration_mins: mins }))}
                    className={cn(
                      'px-5 py-4 rounded-2xl font-semibold transition-all',
                      data.duration_mins === mins
                        ? 'bg-orange-500 text-white'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — equipment */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">What equipment do you have?</h2>
              <p className="text-zinc-400 mb-6">Select all that apply.</p>
              <div className="space-y-3">
                {EQUIPMENT_OPTIONS.map(eq => {
                  const selected = data.equipment.includes(eq.value)
                  return (
                    <button
                      key={eq.value}
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          equipment: selected
                            ? prev.equipment.filter(e => e !== eq.value)
                            : [...prev.equipment, eq.value],
                        }))
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-2xl border transition-all',
                        selected
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      )}
                    >
                      <span className="text-2xl">{eq.emoji}</span>
                      <span className="font-medium">{eq.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4 — goal */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">What's your goal?</h2>
              <p className="text-zinc-400 mb-6">This shapes rep ranges and rest times.</p>
              <div className="space-y-3">
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setData(prev => ({ ...prev, goal: g.value }))}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-all',
                      data.goal === g.value
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    <div className="font-semibold">{g.label}</div>
                    <div className="text-sm text-zinc-400">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={back}
            className="flex items-center gap-1 px-5 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={18} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={generate}
            disabled={generating || data.equipment.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {generating ? (
              <><Loader2 size={18} className="animate-spin" /> Building your plan…</>
            ) : (
              'Generate My Plan'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
