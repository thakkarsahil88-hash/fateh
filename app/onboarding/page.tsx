'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { savePlan } from '@/lib/storage'
import type { Equipment } from '@/lib/types'

type Goal = 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss'
type SplitType = 'PPL' | 'ULUL'

const SPLITS = [
  {
    value: 'PPL' as SplitType,
    label: 'Push / Pull / Legs',
    desc: 'Mon: Push · Wed: Pull · Fri: Legs',
    days: 'Mon, Wed, Fri',
  },
  {
    value: 'ULUL' as SplitType,
    label: 'Upper / Lower',
    desc: 'Mon: Upper · Tue: Lower · Thu: Upper · Fri: Lower',
    days: 'Mon, Tue, Thu, Fri',
  },
]

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; emoji: string }[] = [
  { value: 'bodyweight',      label: 'Bodyweight',       emoji: '🤸' },
  { value: 'dumbbells',       label: 'Dumbbells',        emoji: '🏋️' },
  { value: 'resistance_bands',label: 'Resistance Bands', emoji: '🎗️' },
  { value: 'pull_up_bar',     label: 'Pull-Up Bar',      emoji: '🔝' },
  { value: 'bench',           label: 'Bench / Chair',    emoji: '🪑' },
]

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: 'strength',    label: 'Strength',      desc: 'Get stronger — low reps, heavy weight' },
  { value: 'hypertrophy', label: 'Muscle Growth', desc: 'Build size — moderate reps, progressive overload' },
  { value: 'endurance',   label: 'Endurance',     desc: 'Increase stamina — high reps, circuit style' },
  { value: 'fat_loss',    label: 'Fat Loss',       desc: 'Burn fat — high intensity, short rest' },
]

const STEPS = ['split', 'duration', 'equipment', 'goal'] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const [split, setSplit] = useState<SplitType>('PPL')
  const [durationMins, setDurationMins] = useState(45)
  const [equipment, setEquipment] = useState<Equipment[]>(['bodyweight'])
  const [goal, setGoal] = useState<Goal>('hypertrophy')

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function back() { setStep(s => Math.max(s - 1, 0)) }
  function canNext() { return STEPS[step] !== 'equipment' || equipment.length > 0 }

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/plan-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ split_type: split, duration_mins: durationMins, equipment, goal }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate plan')
      savePlan(json.plan)
      router.push('/home')
    } catch (e: any) {
      setError(e.message)
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-lg mx-auto">
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-orange-500' : 'bg-zinc-800')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex-1">

          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose your split</h2>
              <p className="text-zinc-400 mb-6">Training days are auto-scheduled for you.</p>
              <div className="space-y-3">
                {SPLITS.map(s => (
                  <button key={s.value} onClick={() => setSplit(s.value)}
                    className={cn('w-full text-left p-4 rounded-2xl border transition-all', split === s.value ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700')}>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-sm text-orange-400/80 mt-0.5">{s.days}</div>
                    <div className="text-sm text-zinc-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Time per session?</h2>
              <p className="text-zinc-400 mb-8">We'll fit the right number of exercises.</p>
              <div className="flex gap-3 flex-wrap">
                {[20, 30, 45, 60, 90].map(mins => (
                  <button key={mins} onClick={() => setDurationMins(mins)}
                    className={cn('px-5 py-4 rounded-2xl font-semibold transition-all', durationMins === mins ? 'bg-orange-500 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800')}>
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">What equipment do you have?</h2>
              <p className="text-zinc-400 mb-6">Select all that apply.</p>
              <div className="space-y-3">
                {EQUIPMENT_OPTIONS.map(eq => {
                  const selected = equipment.includes(eq.value)
                  return (
                    <button key={eq.value} onClick={() => setEquipment(selected ? equipment.filter(e => e !== eq.value) : [...equipment, eq.value])}
                      className={cn('w-full flex items-center gap-3 p-4 rounded-2xl border transition-all', selected ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700')}>
                      <span className="text-2xl">{eq.emoji}</span>
                      <span className="font-medium">{eq.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">What's your goal?</h2>
              <p className="text-zinc-400 mb-6">This shapes rep ranges and rest times.</p>
              <div className="space-y-3">
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value)}
                    className={cn('w-full text-left p-4 rounded-2xl border transition-all', goal === g.value ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700')}>
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

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button onClick={back} className="flex items-center gap-1 px-5 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={18} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next} disabled={!canNext()}
            className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold transition-colors">
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={generate} disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold transition-colors">
            {generating ? <><Loader2 size={18} className="animate-spin" /> Building your plan…</> : 'Generate My Plan'}
          </button>
        )}
      </div>
    </div>
  )
}
