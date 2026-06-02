'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'
import { format, parseISO, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import type { WorkoutLog, WeightEntry } from '@/lib/storage'

interface Props {
  weightLog: WeightEntry[]
  workoutDates: string[]
  workouts: WorkoutLog[]
  todayDate: string
}

export default function ProgressClient({ weightLog, workoutDates, workouts, todayDate }: Props) {
  const weeklyVolume = useMemo(() => {
    const map: Record<string, number> = {}
    workouts.forEach(log => {
      const weekStart = format(startOfWeek(parseISO(log.date), { weekStartsOn: 1 }), 'MMM d')
      const vol = log.exercises.reduce((s, ex) =>
        s + ex.sets.reduce((ss, set) => ss + set.reps * set.weight_kg, 0), 0)
      map[weekStart] = (map[weekStart] ?? 0) + vol
    })
    return Object.entries(map).map(([week, volume]) => ({ week, volume: Math.round(volume) }))
  }, [workouts])

  const calendarDays = useMemo(() => Array.from({ length: 84 }, (_, i) => {
    const d = new Date(todayDate); d.setDate(d.getDate() - 83 + i)
    const iso = d.toISOString().split('T')[0]
    return { iso, done: workoutDates.includes(iso) }
  }), [workoutDates, todayDate])

  const streak = useMemo(() => {
    const sorted = [...workoutDates].sort().reverse()
    let s = 0
    for (const dt of sorted) {
      const diff = Math.round((new Date(todayDate).getTime() - new Date(dt).getTime()) / 86400000)
      if (diff === s) s++; else break
    }
    return s
  }, [workoutDates, todayDate])

  const totalVolume = workouts.reduce((s, log) =>
    s + log.exercises.reduce((ss, ex) =>
      ss + ex.sets.reduce((sss, set) => sss + set.reps * set.weight_kg, 0), 0), 0)

  return (
    <div className="p-5 space-y-6 pb-8">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-zinc-400 text-sm">All time</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{streak}</div>
          <div className="text-xs text-zinc-400 mt-1">Streak</div>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{workoutDates.length}</div>
          <div className="text-xs text-zinc-400 mt-1">Sessions</div>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{Math.round(totalVolume).toLocaleString()}</div>
          <div className="text-xs text-zinc-400 mt-1">Total kg</div>
        </div>
      </div>

      {/* Calendar */}
      <div>
        <h2 className="text-base font-semibold mb-3">Workout Calendar</h2>
        <div className="grid grid-cols-7 gap-1">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-zinc-600 mb-1">{d}</div>
          ))}
          {calendarDays.map(({ iso, done }) => (
            <div key={iso} title={iso}
              className={cn('aspect-square rounded-md', done ? 'bg-orange-500' : 'bg-zinc-800', iso === todayDate && !done && 'ring-1 ring-orange-500')} />
          ))}
        </div>
      </div>

      {/* Weight chart */}
      {weightLog.length > 1 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Body Weight (kg)</h2>
          <div className="bg-zinc-900 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weightLog.map(w => ({ date: format(parseISO(w.date), 'MMM d'), kg: w.weight_kg }))}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#71717a' }} width={32} />
                <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="kg" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Volume chart */}
      {weeklyVolume.length > 1 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Weekly Volume (kg lifted)</h2>
          <div className="bg-zinc-900 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} width={40} />
                <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="volume" fill="#f97316" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {workoutDates.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">📊</p>
          <p>Complete your first workout to see progress here.</p>
        </div>
      )}
    </div>
  )
}
