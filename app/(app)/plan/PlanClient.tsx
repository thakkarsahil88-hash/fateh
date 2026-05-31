'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react'
import { getExerciseById, EXERCISES } from '@/lib/exercises'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { MuscleGroup } from '@/lib/types'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  plan: any
  planDays: any[]
}

export default function PlanClient({ plan, planDays }: Props) {
  const [expanded, setExpanded] = useState<string | null>(planDays[0]?.id ?? null)
  const [swapping, setSwapping] = useState<{ dayId: string; exId: string } | null>(null)

  async function swapExercise(planDayId: string, oldExId: string, newExId: string) {
    const supabase = createClient()
    await supabase
      .from('plan_exercises')
      .update({ exercise_id: newExId })
      .eq('plan_day_id', planDayId)
      .eq('exercise_id', oldExId)
    setSwapping(null)
    window.location.reload()
  }

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{plan?.name ?? 'My Plan'}</h1>
          <p className="text-zinc-400 text-sm">
            {plan?.days_per_week} days/week · {plan?.duration_mins} min · {plan?.goal?.replace('_', ' ')}
          </p>
        </div>
        <Link
          href="/onboarding"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-orange-400 transition-colors"
        >
          <RefreshCw size={14} /> New plan
        </Link>
      </div>

      {planDays.map((day: any) => {
        const isOpen = expanded === day.id
        const exercises = (day.plan_exercises ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)

        return (
          <div key={day.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : day.id)}
              className="w-full flex items-center justify-between p-4"
            >
              <div>
                <div className="font-semibold">{day.label}</div>
                <div className="text-xs text-zinc-400">
                  {DAY_NAMES[day.day_of_week]} · {exercises.length} exercises
                </div>
              </div>
              {isOpen ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                {exercises.map((pe: any) => {
                  const ex = getExerciseById(pe.exercise_id)
                  if (!ex) return null

                  return (
                    <div key={pe.exercise_id} className="bg-zinc-800 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ex.gif_url} alt={ex.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{ex.name}</div>
                          <div className="text-xs text-zinc-400">{pe.sets} × {pe.reps} · rest {pe.rest_seconds}s</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={ex.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-orange-400"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => setSwapping({ dayId: day.id, exId: pe.exercise_id })}
                            className="text-xs text-zinc-500 hover:text-orange-400"
                          >
                            swap
                          </button>
                        </div>
                      </div>

                      {/* Swap picker */}
                      {swapping?.dayId === day.id && swapping?.exId === pe.exercise_id && (
                        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                          <p className="text-xs text-zinc-400 mb-2">Pick a replacement:</p>
                          {EXERCISES
                            .filter(e =>
                              e.id !== pe.exercise_id &&
                              e.muscle_groups.some((m: MuscleGroup) => day.muscle_groups?.includes(m))
                            )
                            .map(alt => (
                              <button
                                key={alt.id}
                                onClick={() => swapExercise(day.id, pe.exercise_id, alt.id)}
                                className="w-full text-left text-sm px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors"
                              >
                                {alt.name}
                                <span className="text-zinc-400 text-xs ml-2">{alt.muscle_groups.join(', ')}</span>
                              </button>
                            ))}
                          <button
                            onClick={() => setSwapping(null)}
                            className="text-xs text-zinc-500 mt-1"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
