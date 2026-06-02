'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw, Plus, X, Search, Trash2 } from 'lucide-react'
import { EXERCISES, getExerciseById } from '@/lib/exercises'
import { savePlan } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { StoredPlan, StoredPlanDay, StoredExercise } from '@/lib/storage'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'cardio']

interface LibraryModal {
  mode: 'add' | 'replace'
  dayId: string
  replaceExId?: string
  muscleGroups: string[]
}

export default function PlanClient({ plan: initialPlan }: { plan: StoredPlan }) {
  const [plan, setPlan] = useState(initialPlan)
  const [expanded, setExpanded] = useState<string | null>(plan.days[0]?.id ?? null)
  const [library, setLibrary] = useState<LibraryModal | null>(null)
  const [search, setSearch] = useState('')
  const [filterMuscle, setFilterMuscle] = useState<string>('all')

  // Exercises shown in library modal
  const libraryExercises = useMemo(() => {
    const dayMuscles = library?.muscleGroups ?? []
    return EXERCISES.filter(ex => {
      const matchesMuscle = filterMuscle === 'all'
        ? ex.muscle_groups.some(m => dayMuscles.includes(m))
        : ex.muscle_groups.includes(filterMuscle as any)
      const matchesSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
      return matchesMuscle && matchesSearch
    })
  }, [library, search, filterMuscle])

  function updatePlan(updated: StoredPlan) {
    savePlan(updated)
    setPlan(updated)
  }

  function removeExercise(dayId: string, exId: string) {
    updatePlan({
      ...plan,
      days: plan.days.map(d => d.id !== dayId ? d : {
        ...d,
        exercises: d.exercises.filter(e => e.exercise_id !== exId),
      }),
    })
  }

  function selectFromLibrary(newExId: string) {
    if (!library) return
    const { mode, dayId, replaceExId } = library

    updatePlan({
      ...plan,
      days: plan.days.map(d => {
        if (d.id !== dayId) return d
        if (mode === 'replace' && replaceExId) {
          return {
            ...d,
            exercises: d.exercises.map(e => e.exercise_id !== replaceExId ? e : { ...e, exercise_id: newExId }),
          }
        }
        // add
        const alreadyIn = d.exercises.some(e => e.exercise_id === newExId)
        if (alreadyIn) return d
        const newEx: StoredExercise = {
          exercise_id: newExId,
          sets: 3,
          reps: '10-12',
          rest_seconds: 60,
          sort_order: d.exercises.length,
        }
        return { ...d, exercises: [...d.exercises, newEx] }
      }),
    })

    setLibrary(null)
    setSearch('')
    setFilterMuscle('all')
  }

  function openLibrary(mode: 'add' | 'replace', day: StoredPlanDay, replaceExId?: string) {
    setFilterMuscle('all')
    setSearch('')
    setLibrary({ mode, dayId: day.id, replaceExId, muscleGroups: day.muscle_groups })
  }

  return (
    <div className="p-5 space-y-4 pb-8">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          <p className="text-zinc-400 text-sm">{plan.split_type} · {plan.duration_mins} min · {plan.goal.replace('_', ' ')}</p>
        </div>
        <Link href="/onboarding" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-orange-400 transition-colors">
          <RefreshCw size={14} /> New plan
        </Link>
      </div>

      {plan.days.map(day => {
        const isOpen = expanded === day.id
        const exs = [...day.exercises].sort((a, b) => a.sort_order - b.sort_order)

        return (
          <div key={day.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? null : day.id)} className="w-full flex items-center justify-between p-4">
              <div>
                <div className="font-semibold">{day.label}</div>
                <div className="text-xs text-zinc-400">Day {day.day_index + 1} · {exs.length} exercises</div>
              </div>
              {isOpen ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                {exs.map(pe => {
                  const ex = getExerciseById(pe.exercise_id)
                  if (!ex) return null
                  return (
                    <div key={pe.exercise_id} className="bg-zinc-800 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <img src={ex.gif_url} alt={ex.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{ex.name}</div>
                          <div className="text-xs text-zinc-400">{pe.sets} × {pe.reps} · rest {pe.rest_seconds}s</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a href={ex.youtube_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded-lg">▶</a>
                          <button onClick={() => openLibrary('replace', day, pe.exercise_id)}
                            className="text-xs text-zinc-400 hover:text-orange-400 bg-zinc-700 px-2 py-1 rounded-lg transition-colors">swap</button>
                          <button onClick={() => removeExercise(day.id, pe.exercise_id)}
                            className="text-zinc-500 hover:text-red-400 p-1 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add exercise button */}
                <button onClick={() => openLibrary('add', day)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400 transition-colors text-sm">
                  <Plus size={16} /> Add exercise
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* ── EXERCISE LIBRARY MODAL ── */}
      {library && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-zinc-900 rounded-t-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="font-bold text-lg">
                {library.mode === 'add' ? 'Add Exercise' : 'Replace Exercise'}
              </h2>
              <button onClick={() => setLibrary(null)} className="text-zinc-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 pb-2">
              <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                <Search size={16} className="text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search exercises…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-sm"
                  autoFocus
                />
                {search && <button onClick={() => setSearch('')} className="text-zinc-500"><X size={14} /></button>}
              </div>
            </div>

            {/* Muscle filter chips */}
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilterMuscle('all')}
                className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filterMuscle === 'all' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'
                )}>All</button>
              {MUSCLE_GROUPS.map(m => (
                <button key={m} onClick={() => setFilterMuscle(m)}
                  className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
                    filterMuscle === m ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'
                  )}>{m}</button>
              ))}
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {libraryExercises.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-8">No exercises found</p>
              )}
              {libraryExercises.map(ex => (
                <button key={ex.id} onClick={() => selectFromLibrary(ex.id)}
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-3 transition-colors text-left">
                  <img src={ex.gif_url} alt={ex.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{ex.name}</div>
                    <div className="text-xs text-zinc-400 capitalize">{ex.muscle_groups.join(', ')}</div>
                    <div className="text-xs text-zinc-500">{ex.default_sets} sets · {ex.default_reps} reps · {ex.difficulty}</div>
                  </div>
                  <Plus size={18} className="text-orange-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
