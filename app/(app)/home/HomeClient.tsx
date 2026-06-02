'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Scale } from 'lucide-react'
import { saveWeight, resetDayIndex } from '@/lib/storage'
import { getExerciseById } from '@/lib/exercises'
import { cn } from '@/lib/utils'
import type { StoredPlan } from '@/lib/storage'

interface Props {
  plan: StoredPlan
  currentDayIndex: number
  alreadyWorkedOut: boolean
  workoutDates: string[]
  latestWeight: number | null
  todayDate: string
}

function calcStreak(dates: string[], today: string): number {
  const sorted = [...new Set(dates)].sort().reverse()
  let streak = 0
  for (const d of sorted) {
    const diff = Math.round((new Date(today).getTime() - new Date(d).getTime()) / 86400000)
    if (diff === streak) streak++; else break
  }
  return streak
}

export default function HomeClient({ plan, currentDayIndex, alreadyWorkedOut, workoutDates, latestWeight, todayDate }: Props) {
  const router = useRouter()
  const [weight, setWeight] = useState('')
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [currentWeight, setCurrentWeight] = useState(latestWeight)
  const [isRest, setIsRest] = useState(false)

  const streak = calcStreak(workoutDates, todayDate)
  const currentPlanDay = plan.days[currentDayIndex % plan.days.length]
  const exercises = currentPlanDay?.exercises ?? []

  function logWeight() {
    if (!weight) return
    const w = parseFloat(weight)
    saveWeight({ date: todayDate, weight_kg: w })
    setCurrentWeight(w)
    setShowWeightInput(false)
    setWeight('')
  }

  function handleStartWorkout() {
    router.push('/workout')
  }

  function handleStartFresh() {
    resetDayIndex()
    router.push('/workout')
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-zinc-400 text-sm">Welcome back</p>
          <h1 className="text-2xl font-bold">Fateh 💪</h1>
        </div>
        <div className="text-right text-sm text-zinc-400">
          {new Date(todayDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Flame size={20} className="text-orange-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{streak}</div>
            <div className="text-xs text-zinc-400">day streak</div>
          </div>
        </div>
        <button onClick={() => setShowWeightInput(true)} className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Scale size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{currentWeight ?? '—'}</div>
            <div className="text-xs text-zinc-400">kg {!currentWeight && '(tap)'}</div>
          </div>
        </button>
      </div>

      {/* Weight input */}
      {showWeightInput && (
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium">Log today's weight</p>
          <div className="flex gap-2">
            <input type="number" step="0.1" placeholder="e.g. 72.5" value={weight}
              onChange={e => setWeight(e.target.value)}
              className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none" />
            <button onClick={logWeight} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium">Save</button>
            <button onClick={() => setShowWeightInput(false)} className="px-3 text-zinc-400">✕</button>
          </div>
        </div>
      )}

      {/* ── Already worked out today ── */}
      {alreadyWorkedOut && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-green-500/20">
          <div className="text-2xl mb-2">✅</div>
          <p className="font-semibold text-green-400">Done for today!</p>
          <p className="text-sm text-zinc-400 mt-1">
            Next up: <span className="text-white font-medium">
              {plan.days[(currentDayIndex) % plan.days.length]?.label}
            </span>
          </p>
          <button onClick={handleStartWorkout}
            className="mt-3 text-sm text-zinc-400 hover:text-orange-400 underline transition-colors">
            Log another session anyway
          </button>
        </div>
      )}

      {/* ── Rest day or workout? ── */}
      {!alreadyWorkedOut && !isRest && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <p className="font-semibold text-lg mb-1">How's today?</p>
          <p className="text-zinc-400 text-sm mb-4">
            Up next: <span className="text-orange-400 font-semibold">{currentPlanDay?.label}</span>
            <span className="text-zinc-500"> · Day {currentDayIndex + 1} of {plan.days.length}</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setIsRest(true)}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors">
              😴 Rest day
            </button>
            <button onClick={handleStartWorkout}
              className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">
              💪 Let's go!
            </button>
          </div>
        </div>
      )}

      {/* ── Rest day chosen ── */}
      {!alreadyWorkedOut && isRest && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 text-center space-y-3">
          <div className="text-4xl">🛋️</div>
          <p className="font-semibold">Rest day — recover well</p>
          <p className="text-sm text-zinc-400">
            Next: <span className="text-orange-400">{currentPlanDay?.label}</span> whenever you're ready
          </p>
          <button onClick={() => setIsRest(false)}
            className="text-sm text-zinc-500 hover:text-orange-400 transition-colors underline">
            Changed my mind — work out
          </button>
        </div>
      )}

      {/* ── Workout preview (shown when ready) ── */}
      {!alreadyWorkedOut && !isRest && (
        <div>
          <h2 className="text-base font-semibold mb-3">Today's Plan</h2>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="font-semibold text-lg">{currentPlanDay?.label}</div>
              <div className="text-sm text-zinc-400">{exercises.length} exercises · {currentPlanDay?.muscle_groups?.slice(0,3).join(', ')}</div>
            </div>
            <div className="divide-y divide-zinc-800">
              {exercises.slice(0, 4).map((pe: any) => {
                const ex = getExerciseById(pe.exercise_id)
                if (!ex) return null
                return (
                  <div key={pe.exercise_id} className="px-4 py-3 flex items-center gap-3">
                    <img src={ex.gif_url} alt={ex.name} className="w-9 h-9 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ex.name}</div>
                      <div className="text-xs text-zinc-500">{pe.sets} sets × {pe.reps}</div>
                    </div>
                  </div>
                )
              })}
              {exercises.length > 4 && <div className="px-4 py-2 text-xs text-zinc-500">+{exercises.length - 4} more</div>}
            </div>
            <div className="p-4 flex gap-2">
              <button onClick={handleStartWorkout}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
                Start {currentPlanDay?.label} →
              </button>
              <button onClick={handleStartFresh}
                className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors"
                title="Restart from Day 1">
                ↺
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini calendar */}
      <div>
        <h2 className="text-base font-semibold mb-3">Recent Activity</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date(todayDate + 'T12:00:00'); d.setDate(d.getDate() - 13 + i)
            const iso = d.toISOString().split('T')[0]
            const done = workoutDates.includes(iso)
            const isToday = iso === todayDate
            return (
              <div key={iso} className="text-center">
                <div className="text-xs text-zinc-600 mb-1">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                <div className={cn(
                  'w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-medium',
                  done ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500',
                  isToday && !done && 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-950'
                )}>{d.getDate()}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
