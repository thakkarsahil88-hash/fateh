'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Scale, ChevronRight, RotateCcw } from 'lucide-react'
import { saveWeight, setCurrentDayIndex, resetDayIndex, advanceDayIndex } from '@/lib/storage'
import { getExerciseById } from '@/lib/exercises'
import { cn } from '@/lib/utils'
import type { StoredPlan } from '@/lib/storage'

interface Props {
  plan: StoredPlan
  currentDayIndex: number
  isRestDay: boolean
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

export default function HomeClient({ plan, currentDayIndex, isRestDay, alreadyWorkedOut, workoutDates, latestWeight, todayDate }: Props) {
  const router = useRouter()
  const [weight, setWeight] = useState('')
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [currentWeight, setCurrentWeight] = useState(latestWeight)

  // Modal states
  const [showRestPrompt, setShowRestPrompt] = useState(isRestDay && !alreadyWorkedOut)
  const [showStartDialog, setShowStartDialog] = useState(false)

  const streak = calcStreak(workoutDates, todayDate)
  const currentPlanDay = plan.days[currentDayIndex % plan.days.length]
  const nextPlanDay = plan.days[(currentDayIndex + 1) % plan.days.length]
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
    if (alreadyWorkedOut) { router.push('/workout'); return }
    setShowStartDialog(true)
  }

  function startFromCurrent() {
    setShowStartDialog(false)
    setShowRestPrompt(false)
    router.push('/workout')
  }

  function startFromBeginning() {
    resetDayIndex()
    setShowStartDialog(false)
    setShowRestPrompt(false)
    router.push('/workout')
  }

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

      {/* ── REST DAY PROMPT ── */}
      {showRestPrompt && !alreadyWorkedOut && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <div className="text-3xl mb-3">🛋️</div>
          <h2 className="text-lg font-bold mb-1">Rest day today</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Today isn't a scheduled training day. How are you feeling?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowRestPrompt(false)}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors">
              😴 Taking rest
            </button>
            <button onClick={() => { setShowRestPrompt(false); setShowStartDialog(true) }}
              className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">
              💪 Work out anyway
            </button>
          </div>
        </div>
      )}

      {/* ── TODAY'S WORKOUT CARD ── */}
      {(!showRestPrompt || alreadyWorkedOut) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {alreadyWorkedOut ? "Today's Workout" : `Up Next — Day ${currentDayIndex + 1}`}
            </h2>
            <span className="text-xs text-zinc-500">
              {plan.split_type} · Day {currentDayIndex + 1}/{plan.days.length}
            </span>
          </div>

          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{currentPlanDay?.label}</div>
                <div className="text-sm text-zinc-400">
                  {exercises.length} exercises · {currentPlanDay?.muscle_groups?.slice(0,3).join(', ')}
                </div>
              </div>
              {alreadyWorkedOut && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Done ✓</span>}
            </div>

            {/* Exercise preview */}
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

            <div className="p-4 space-y-2">
              <button onClick={handleStartWorkout}
                className="w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
                {alreadyWorkedOut ? 'View Workout' : `Start ${currentPlanDay?.label} Day →`}
              </button>
            </div>
          </div>

          {/* Up next preview */}
          {!alreadyWorkedOut && nextPlanDay && (
            <p className="text-xs text-zinc-600 mt-2 px-1">
              After this → Day {(currentDayIndex + 1) % plan.days.length + 1}: {nextPlanDay.label}
            </p>
          )}
        </div>
      )}

      {/* ── START DIALOG ── */}
      {showStartDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Start Workout</h2>
            <p className="text-zinc-400 text-sm">Where would you like to start?</p>

            <button onClick={startFromCurrent}
              className="w-full text-left p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Continue — Day {currentDayIndex + 1}</div>
                  <div className="text-sm text-orange-400">{currentPlanDay?.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Pick up from where you left off</div>
                </div>
                <ChevronRight size={20} className="text-zinc-500" />
              </div>
            </button>

            <button onClick={startFromBeginning}
              className="w-full text-left p-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <RotateCcw size={14} className="text-zinc-400" /> Start afresh — Day 1
                  </div>
                  <div className="text-sm text-zinc-400">{plan.days[0]?.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Reset the plan cycle</div>
                </div>
                <ChevronRight size={20} className="text-zinc-500" />
              </div>
            </button>

            <button onClick={() => setShowStartDialog(false)} className="w-full text-center text-zinc-500 text-sm py-2">
              Cancel
            </button>
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
            const isTraining = plan.selected_days.includes((d.getDay() + 6) % 7)
            const done = workoutDates.includes(iso)
            const isToday = iso === todayDate
            return (
              <div key={iso} className="text-center">
                <div className="text-xs text-zinc-600 mb-1">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                <div className={cn(
                  'w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-medium',
                  done ? 'bg-orange-500 text-white' : isTraining ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-900 text-zinc-600',
                  isToday && !done && 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-950'
                )}>{d.getDate()}</div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-zinc-600">
          <span><span className="inline-block w-2 h-2 rounded bg-orange-500 mr-1" />Done</span>
          <span><span className="inline-block w-2 h-2 rounded bg-zinc-800 mr-1" />Training day</span>
          <span><span className="inline-block w-2 h-2 rounded bg-zinc-900 mr-1" />Rest day</span>
        </div>
      </div>
    </div>
  )
}
