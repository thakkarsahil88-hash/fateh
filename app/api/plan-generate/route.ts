import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { EXERCISES } from '@/lib/exercises'
import type { MuscleGroup } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Auto-assign days of week based on split — no user input needed
// PPL  → Mon(0), Wed(2), Fri(4)
// ULUL → Mon(0), Tue(1), Thu(3), Fri(4)
const SPLIT_DAYS: Record<string, { label: string; muscle_groups: MuscleGroup[]; day_of_week: number }[]> = {
  PPL: [
    { label: 'Push', muscle_groups: ['chest', 'shoulders', 'triceps'], day_of_week: 0 },
    { label: 'Pull', muscle_groups: ['back', 'biceps'],               day_of_week: 2 },
    { label: 'Legs', muscle_groups: ['legs', 'glutes', 'core'],       day_of_week: 4 },
  ],
  ULUL: [
    { label: 'Upper', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], day_of_week: 0 },
    { label: 'Lower', muscle_groups: ['legs', 'glutes', 'core'],                           day_of_week: 1 },
    { label: 'Upper', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], day_of_week: 3 },
    { label: 'Lower', muscle_groups: ['legs', 'glutes', 'core'],                           day_of_week: 4 },
  ],
}

export async function POST(req: NextRequest) {
  try {
    const { split_type, duration_mins, equipment, goal } = await req.json()

    const dayTemplates = SPLIT_DAYS[split_type] ?? SPLIT_DAYS['PPL']
    const days_per_week = dayTemplates.length

    const availableExercises = EXERCISES.filter(e =>
      e.equipment.some(eq => equipment.includes(eq))
    )

    const exerciseSummary = availableExercises.map(e =>
      `${e.id} | ${e.name} | muscles: ${e.muscle_groups.join(',')} | difficulty: ${e.difficulty}`
    ).join('\n')

    const prompt = `You are designing a home gym workout plan.

User details:
- Split: ${split_type}
- Session duration: ${duration_mins} minutes
- Goal: ${goal}
- Equipment: ${equipment.join(', ')}

Available exercises (id | name | muscles | difficulty):
${exerciseSummary}

Day structure:
${dayTemplates.map((d, i) => `Day ${i + 1} (${d.label}): targets ${d.muscle_groups.join(', ')}`).join('\n')}

Rules:
- Assign ${duration_mins <= 30 ? '4-5' : duration_mins <= 45 ? '5-6' : duration_mins <= 60 ? '6-8' : '8-10'} exercises per day
- Goal "${goal}": ${goal === 'strength' ? 'compound movements, 3-5 reps' : goal === 'hypertrophy' ? '8-12 reps, mix compounds + isolation' : goal === 'endurance' ? '15-20 reps, short rest' : '12-15 reps, high intensity'}
- Only use exercises matching each day's muscle groups
- Include 1 core exercise per Legs/Lower day
- No same exercise on consecutive days

Respond ONLY with valid JSON (no markdown):
{
  "plan_name": "string",
  "days": [
    { "label": "string", "exercises": [{"exercise_id": "string", "sets": number, "reps": "string", "rest_seconds": number}] }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

    let aiPlan: any
    try { aiPlan = JSON.parse(cleaned) }
    catch { return NextResponse.json({ error: 'AI returned invalid response. Try again.' }, { status: 500 }) }

    const plan = {
      id: crypto.randomUUID(),
      name: aiPlan.plan_name ?? `${split_type} Plan`,
      split_type,
      days_per_week,
      duration_mins,
      equipment,
      goal,
      created_at: new Date().toISOString(),
      days: aiPlan.days.map((d: any, i: number) => ({
        id: crypto.randomUUID(),
        day_index: i,
        label: dayTemplates[i].label,
        muscle_groups: dayTemplates[i].muscle_groups,
        exercises: d.exercises.map((ex: any, j: number) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds ?? 60,
          sort_order: j,
        })),
      })),
    }

    return NextResponse.json({ plan })
  } catch (e: any) {
    console.error('plan-generate error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
