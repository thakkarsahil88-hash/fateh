'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Scale } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getExerciseById } from '@/lib/exercises'
import { cn } from '@/lib/utils'

interface Props {
  phone: string
  profile: any
  todayPlanDay: any
  workoutDates: string[]
  latestWeight: number | null
  todayDate: string
}

function calcStreak(dates: string[], today: string): number {
  const sorted = [...new Set(dates)].sort().reverse()
  if (!sorted.length) return 0
  let streak = 0
  for (const dateStr of sorted) {
    const diff = Math.round((new Date(today).getTime() - new Date(dateStr).getTime()) / 86400000)
    if (diff === streak) streak++
    else break
  }
  return streak
}

export default function HomeClient({ phone, profile, todayPlanDay, workoutDates, latestWeight, todayDate }: Props) {
  const [weight, setWeight] = useState('')
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [currentWeight, setCurrentWeight] = useState(latestWeight)

  const streak = calcStreak(workoutDates, todayDate)
  const alreadyWorkedOut = workoutDates.includes(todayDate)
  const exercises = todayPlanDay?.plan_exercises ?? []

  async function logWeight() {
    if (!weight) return
    const supabase = createClient()
    await supabase.from('fateh_body_weight_log').upsert({
      phone,
      date: todayDate,
      weight_kg: parseFloat(weight),
    }, { onConflict: 'phone,date' })
    setCurrentWeight(parseFloat(weight))
    setShowWeightInput(false)
    setWeight('')
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-zinc-400 text-sm">Good morning,</p>
          <h1 className="text-2xl font-bold">{profile.display_name ?? phone}</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">Today</div>
          <div className="text-sm font-medium">
            {new Date(todayDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* Stats row */}
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

        <button
          onClick={() => setShowWeightInput(true)}
          className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Scale size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{currentWeight ?? '—'}</div>
            <div className="text-xs text-zinc-400">kg {currentWeight ? '' : '(tap to log)'}</div>
          </div>
        </button>
      </div>

      {/* Weight input */}
      {showWeightInput && (
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium">Log today's weight</p>
          <div className="flex gap-2">
            <input
              type="number" step="0.1" placeholder="e.g. 72.5"
              value={weight} onChange={e => setWeight(e.target.value)}
              className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none"
            />
            <button onClick={logWeight} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600">Save</button>
            <button onClick={() => setShowWeightInput(false)} className="px-3 py-2 text-zinc-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Today's workout */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today's Workout</h2>
        {todayPlanDay ? (
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-semibold">{todayPlanDay.label}</div>
                <div className="text-sm text-zinc-400">
                  {exercises.length} exercises
                  {todayPlanDay.muscle_groups?.length > 0 && ` · ${todayPlanDay.muscle_groups.slice(0, 3).join(', ')}`}
                </div>
              </div>
              {alreadyWorkedOut && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Done ✓</span>
              )}
            </div>
            <div className="divide-y divide-zinc-800">
              {exercises.slice(0, 4).map((pe: any) => {
                const ex = getExerciseById(pe.exercise_id)
                if (!ex) return null
                return (
                  <div key={pe.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full bg-orange-500/40" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{ex.name}</div>
                      <div className="text-xs text-zinc-500">{pe.sets} sets × {pe.reps} reps</div>
                    </div>
                  </div>
                )
              })}
              {exercises.length > 4 && (
                <div className="px-4 py-2 text-xs text-zinc-500">+{exercises.length - 4} more</div>
              )}
            </div>
            <div className="p-4">
              <Link
                href="/workout"
                className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {alreadyWorkedOut ? 'View Workout' : 'Start Workout'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-2xl p-6 text-center">
            <p className="text-zinc-400 mb-1">Rest day today 🛋️</p>
            <p className="text-sm text-zinc-500">No workout scheduled</p>
          </div>
        )}
      </div>

      {/* Mini calendar */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date(todayDate)
            d.setDate(d.getDate() - 13 + i)
            const iso = d.toISOString().split('T')[0]
            const done = workoutDates.includes(iso)
            const isToday = iso === todayDate
            return (
              <div key={iso} className="text-center">
                <div className="text-xs text-zinc-600 mb-1">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                <div className={cn(
                  'w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs',
                  done ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500',
                  isToday && !done && 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-950'
                )}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
