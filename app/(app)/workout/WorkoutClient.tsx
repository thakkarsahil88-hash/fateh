'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, PlayCircle, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getExerciseById } from '@/lib/exercises'
import { cn } from '@/lib/utils'
import type { SetLog } from '@/lib/types'

interface Props {
  userId: string
  planDay: any
  todayDate: string
}

interface ExerciseState {
  sets: SetLog[]
  expanded: boolean
  gifOpen: boolean
}

export default function WorkoutClient({ userId, planDay, todayDate }: Props) {
  const router = useRouter()
  const startTime = useRef(Date.now())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const planExercises: any[] = planDay?.plan_exercises ?? []

  const [states, setStates] = useState<Record<string, ExerciseState>>(() => {
    const init: Record<string, ExerciseState> = {}
    planExercises.forEach((pe: any) => {
      init[pe.exercise_id] = {
        sets: Array.from({ length: pe.sets }, () => ({ reps: 0, weight_kg: 0 })),
        expanded: true,
        gifOpen: false,
      }
    })
    return init
  })

  function updateSet(exId: string, setIdx: number, field: 'reps' | 'weight_kg', value: number) {
    setStates(prev => {
      const sets = [...prev[exId].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      return { ...prev, [exId]: { ...prev[exId], sets } }
    })
  }

  function toggleExpand(exId: string) {
    setStates(prev => ({ ...prev, [exId]: { ...prev[exId], expanded: !prev[exId].expanded } }))
  }

  function toggleGif(exId: string) {
    setStates(prev => ({ ...prev, [exId]: { ...prev[exId], gifOpen: !prev[exId].gifOpen } }))
  }

  async function completeWorkout() {
    setSaving(true)
    const supabase = createClient()
    const durationMins = Math.round((Date.now() - startTime.current) / 60000)

    const { data: workoutLog, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        plan_day_id: planDay?.id,
        date: todayDate,
        duration_mins: durationMins,
      })
      .select()
      .single()

    if (error || !workoutLog) { setSaving(false); return }

    const exerciseLogs = planExercises.map((pe: any) => ({
      workout_log_id: workoutLog.id,
      exercise_id: pe.exercise_id,
      sets: states[pe.exercise_id].sets.filter(s => s.reps > 0),
    }))

    await supabase.from('exercise_logs').insert(exerciseLogs)

    setDone(true)
    setTimeout(() => { router.push('/home'); router.refresh() }, 1500)
  }

  if (!planDay) {
    return (
      <div className="p-5 text-center pt-20">
        <div className="text-4xl mb-4">🛋️</div>
        <h2 className="text-xl font-semibold mb-2">Rest Day</h2>
        <p className="text-zinc-400">No workout scheduled today. Recover well.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="p-5 text-center pt-20">
        <div className="text-6xl mb-4">🔥</div>
        <h2 className="text-2xl font-bold mb-2">Workout Complete!</h2>
        <p className="text-zinc-400">Fateh ho gaya aaj ka.</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">{planDay.label}</h1>
        <p className="text-zinc-400 text-sm">{planExercises.length} exercises · tap to log sets</p>
      </div>

      {planExercises
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((pe: any) => {
          const ex = getExerciseById(pe.exercise_id)
          if (!ex) return null
          const state = states[ex.id]

          return (
            <div key={ex.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
              {/* Exercise header */}
              <button
                onClick={() => toggleExpand(ex.id)}
                className="w-full flex items-center gap-3 p-4"
              >
                <div
                  className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={e => { e.stopPropagation(); toggleGif(ex.id) }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ex.gif_url} alt={ex.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{ex.name}</div>
                  <div className="text-xs text-zinc-400">{pe.sets} sets × {pe.reps} reps</div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={ex.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-zinc-500 hover:text-orange-400"
                  >
                    <ExternalLink size={16} />
                  </a>
                  {state.expanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                </div>
              </button>

              {/* GIF modal */}
              {state.gifOpen && (
                <div
                  className="mx-4 mb-3 rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => toggleGif(ex.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ex.gif_url} alt={ex.name} className="w-full" />
                  <div className="bg-zinc-800 px-3 py-2 text-xs text-zinc-400">{ex.instructions}</div>
                </div>
              )}

              {/* Sets */}
              {state.expanded && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="grid grid-cols-3 text-xs text-zinc-500 mb-1 px-1">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>kg</span>
                  </div>
                  {state.sets.map((s, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                      <span className="text-sm text-zinc-400 px-1">#{idx + 1}</span>
                      <input
                        type="number"
                        min={0}
                        value={s.reps || ''}
                        placeholder={pe.reps.split('-')[0]}
                        onChange={e => updateSet(ex.id, idx, 'reps', parseInt(e.target.value) || 0)}
                        className="bg-zinc-800 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={s.weight_kg || ''}
                        placeholder="0"
                        onChange={e => updateSet(ex.id, idx, 'weight_kg', parseFloat(e.target.value) || 0)}
                        className="bg-zinc-800 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      <button
        onClick={completeWorkout}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
      >
        {saving ? (
          <><Loader2 size={20} className="animate-spin" /> Saving…</>
        ) : (
          <><CheckCircle size={20} /> I Completed It!</>
        )}
      </button>
    </div>
  )
}
