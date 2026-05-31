'use client'

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid
} from 'recharts'
import { format, parseISO, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { getExerciseById } from '@/lib/exercises'

interface Props {
  weightLog: { date: string; weight_kg: number }[]
  workoutDates: string[]
  exerciseLogs: any[]
  todayDate: string
}

export default function ProgressClient({ weightLog, workoutDates, exerciseLogs, todayDate }: Props) {
  // Weekly volume
  const weeklyVolume = useMemo(() => {
    const map: Record<string, number> = {}
    exerciseLogs.forEach((log: any) => {
      const d = log.workout_logs?.date
      if (!d) return
      const weekStart = format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), 'MMM d')
      const vol = (log.sets as any[]).reduce((s: number, set: any) => s + (set.reps ?? 0) * (set.weight_kg ?? 0), 0)
      map[weekStart] = (map[weekStart] ?? 0) + vol
    })
    return Object.entries(map).map(([week, volume]) => ({ week, volume: Math.round(volume) }))
  }, [exerciseLogs])

  // Calendar — last 84 days (12 weeks)
  const calendarDays = useMemo(() => {
    return Array.from({ length: 84 }, (_, i) => {
      const d = new Date(todayDate)
      d.setDate(d.getDate() - 83 + i)
      const iso = d.toISOString().split('T')[0]
      return { iso, done: workoutDates.includes(iso), day: d.getDate(), month: d.getMonth() }
    })
  }, [workoutDates, todayDate])

  const streak = useMemo(() => {
    const sorted = [...workoutDates].sort().reverse()
    let s = 0
    const d = new Date(todayDate)
    for (const dt of sorted) {
      const diff = Math.round((d.getTime() - new Date(dt).getTime()) / 86400000)
      if (diff === s) s++
      else break
    }
    return s
  }, [workoutDates, todayDate])

  return (
    <div className="p-5 space-y-6 pb-8">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-zinc-400 text-sm">Last 90 days</p>
      </div>

      {/* Stats */}
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
          <div className="text-2xl font-bold text-orange-400">
            {weeklyVolume.reduce((s, w) => s + w.volume, 0).toLocaleString()}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Total kg</div>
        </div>
      </div>

      {/* Workout calendar */}
      <div>
        <h2 className="text-base font-semibold mb-3">Workout Calendar</h2>
        <div className="grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-zinc-600 mb-1">{d}</div>
          ))}
          {calendarDays.map(({ iso, done }) => (
            <div
              key={iso}
              title={iso}
              className={cn(
                'aspect-square rounded-md',
                done ? 'bg-orange-500' : 'bg-zinc-800',
                iso === todayDate && !done && 'ring-1 ring-orange-500'
              )}
            />
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
                <Tooltip
                  contentStyle={{ background: '#18181b', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly volume chart */}
      {weeklyVolume.length > 1 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Weekly Volume (kg lifted)</h2>
          <div className="bg-zinc-900 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} width={40} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {weightLog.length === 0 && workoutDates.length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">📊</p>
          <p>Start working out to see your progress here.</p>
        </div>
      )}
    </div>
  )
}
