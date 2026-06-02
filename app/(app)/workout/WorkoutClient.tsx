'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronDown, ChevronUp, ExternalLink, Loader2, Plus, Minus } from 'lucide-react'
import { saveWorkout } from '@/lib/storage'
import { getExerciseById } from '@/lib/exercises'
import type { SetLog } from '@/lib/storage'

interface Props {
  planDay: any
  todayDate: string
}

interface ExState {
  sets: SetLog[]
  expanded: boolean
  gifOpen: boolean
}

export default function WorkoutClient({ planDay, todayDate }: Props) {
  const router = useRouter()
  const startTime = useRef(Date.now())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const planExercises: any[] = planDay?.exercises ?? []

  const [states, setStates] = useState<Record<string, ExState>>(() => {
    const init: any = {}
    planExercises.forEach((pe: any) => {
      init[pe.exercise_id] = {
        sets: Array.from({ length: pe.sets }, () => ({ reps: 0, weight_kg: 0, is_bodyweight: false })),
        expanded: true,
        gifOpen: false,
      }
    })
    return init
  })

  function updateSet(exId: string, idx: number, field: keyof SetLog, value: any) {
    setStates(prev => {
      const sets = [...prev[exId].sets]
      sets[idx] = { ...sets[idx], [field]: value }
      return { ...prev, [exId]: { ...prev[exId], sets } }
    })
  }

  function addSet(exId: string) {
    setStates(prev => ({
      ...prev,
      [exId]: { ...prev[exId], sets: [...prev[exId].sets, { reps: 0, weight_kg: 0, is_bodyweight: false }] },
    }))
  }

  function removeSet(exId: string) {
    setStates(prev => {
      if (prev[exId].sets.length <= 1) return prev
      return { ...prev, [exId]: { ...prev[exId], sets: prev[exId].sets.slice(0, -1) } }
    })
  }

  function toggle(exId: string, key: 'expanded' | 'gifOpen') {
    setStates(prev => ({ ...prev, [exId]: { ...prev[exId], [key]: !prev[exId][key] } }))
  }

  function completeWorkout() {
    setSaving(true)
    const durationMins = Math.round((Date.now() - startTime.current) / 60000)
    saveWorkout({
      id: crypto.randomUUID(),
      date: todayDate,
      plan_day_id: planDay?.id ?? '',
      plan_day_label: planDay?.label ?? '',
      duration_mins: Math.max(durationMins, 1),
      exercises: planExercises.map((pe: any) => ({
        exercise_id: pe.exercise_id,
        sets: states[pe.exercise_id].sets.filter(s => s.reps > 0 || s.is_bodyweight),
      })),
    })
    setDone(true)
    setTimeout(() => router.push('/home'), 1500)
  }

  if (!planDay) return (
    <div className="p-5 text-center pt-20">
      <div className="text-4xl mb-4">🛋️</div>
      <h2 className="text-xl font-semibold mb-2">Rest Day</h2>
      <p className="text-zinc-400">No workout scheduled today. Recover well.</p>
    </div>
  )

  if (done) return (
    <div className="p-5 text-center pt-20">
      <div className="text-6xl mb-4">🔥</div>
      <h2 className="text-2xl font-bold mb-2">Workout Complete!</h2>
      <p className="text-zinc-400">Fateh ho gaya aaj ka.</p>
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{planDay.label}</h1>
        <p className="text-zinc-400 text-sm">{planExercises.length} exercises · log your sets below</p>
      </div>

      {[...planExercises].sort((a, b) => a.sort_order - b.sort_order).map((pe: any) => {
        const ex = getExerciseById(pe.exercise_id)
        if (!ex) return null
        const state = states[ex.id]

        return (
          <div key={ex.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
            {/* Header */}
            <button onClick={() => toggle(ex.id, 'expanded')} className="w-full flex items-center gap-3 p-4">
              {/* GIF thumbnail — tap to enlarge */}
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 cursor-pointer border-2 border-zinc-700"
                onClick={e => { e.stopPropagation(); toggle(ex.id, 'gifOpen') }}>
                <img src={ex.gif_url} alt={ex.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">{ex.name}</div>
                <div className="text-xs text-zinc-400">{state.sets.length} sets · {pe.reps} reps</div>
                <div className="text-xs text-zinc-500 mt-0.5">{ex.muscle_groups.join(', ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg bg-zinc-800">
                  ▶ Short
                </a>
                {state.expanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
              </div>
            </button>

            {/* GIF expanded view */}
            {state.gifOpen && (
              <div className="mx-4 mb-3 rounded-xl overflow-hidden cursor-pointer" onClick={() => toggle(ex.id, 'gifOpen')}>
                <img src={ex.gif_url} alt={ex.name} className="w-full rounded-xl" />
                <p className="text-xs text-zinc-400 mt-2 px-1 pb-1">{ex.instructions}</p>
              </div>
            )}

            {/* Set logger */}
            {state.expanded && (
              <div className="px-4 pb-4 space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[32px_1fr_1fr_80px] gap-2 text-xs text-zinc-500 px-1">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                  <span>Bodyweight</span>
                </div>

                {state.sets.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-[32px_1fr_1fr_80px] gap-2 items-center">
                    <span className="text-sm text-zinc-400 font-medium">#{idx + 1}</span>

                    {/* Reps */}
                    <input
                      type="number" min={0}
                      value={s.reps || ''}
                      placeholder={pe.reps.split('-')[0]}
                      onChange={e => updateSet(ex.id, idx, 'reps', parseInt(e.target.value) || 0)}
                      className="bg-zinc-800 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />

                    {/* Weight */}
                    <input
                      type="number" min={0} step={0.5}
                      value={s.is_bodyweight ? '' : (s.weight_kg || '')}
                      placeholder={s.is_bodyweight ? 'BW' : '0'}
                      disabled={s.is_bodyweight}
                      onChange={e => updateSet(ex.id, idx, 'weight_kg', parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />

                    {/* Bodyweight checkbox */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => updateSet(ex.id, idx, 'is_bodyweight', !s.is_bodyweight)}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${s.is_bodyweight ? 'bg-orange-500 border-orange-500' : 'border-zinc-600 bg-zinc-800'}`}
                      >
                        {s.is_bodyweight && <span className="text-white text-xs font-bold">✓</span>}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add / remove set buttons */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => addSet(ex.id)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-orange-400 bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus size={12} /> Add set
                  </button>
                  {state.sets.length > 1 && (
                    <button onClick={() => removeSet(ex.id)}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
                      <Minus size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button onClick={completeWorkout} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-colors mt-2">
        {saving ? <><Loader2 size={20} className="animate-spin" /> Saving…</> : <><CheckCircle size={20} /> I Completed It!</>}
      </button>
    </div>
  )
}
