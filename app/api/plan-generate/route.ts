import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { EXERCISES } from '@/lib/exercises'
import type { SplitType, Equipment, MuscleGroup } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getDayTemplate(split: SplitType, days: number): { label: string; muscle_groups: MuscleGroup[] }[] {
  const templates: Record<SplitType, { label: string; muscle_groups: MuscleGroup[] }[]> = {
    full_body: Array.from({ length: days }, (_, i) => ({
      label: `Full Body ${i + 1}`,
      muscle_groups: ['chest', 'back', 'legs', 'shoulders', 'core'] as MuscleGroup[],
    })),
    upper_lower: [
      { label: 'Upper A', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] as MuscleGroup[] },
      { label: 'Lower A', muscle_groups: ['legs', 'glutes', 'core'] as MuscleGroup[] },
      { label: 'Upper B', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] as MuscleGroup[] },
      { label: 'Lower B', muscle_groups: ['legs', 'glutes', 'core'] as MuscleGroup[] },
    ].slice(0, days),
    ULUL: [
      { label: 'Upper', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] as MuscleGroup[] },
      { label: 'Lower', muscle_groups: ['legs', 'glutes', 'core'] as MuscleGroup[] },
      { label: 'Upper', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] as MuscleGroup[] },
      { label: 'Lower', muscle_groups: ['legs', 'glutes', 'core'] as MuscleGroup[] },
    ].slice(0, days),
    PPL: [
      { label: 'Push', muscle_groups: ['chest', 'shoulders', 'triceps'] as MuscleGroup[] },
      { label: 'Pull', muscle_groups: ['back', 'biceps'] as MuscleGroup[] },
      { label: 'Legs', muscle_groups: ['legs', 'glutes', 'core'] as MuscleGroup[] },
      { label: 'Push', muscle_groups: ['chest', 'shoulders', 'triceps'] as MuscleGroup[] },
      { label: 'Pull', muscle_groups: ['back', 'biceps'] as MuscleGroup[] },
      { label: 'Legs', muscle_groups: ['legs', 'glutes', 'core'] as MuscleGroup[] },
    ].slice(0, days),
    push_pull: [
      { label: 'Push', muscle_groups: ['chest', 'shoulders', 'triceps'] as MuscleGroup[] },
      { label: 'Pull', muscle_groups: ['back', 'biceps'] as MuscleGroup[] },
      { label: 'Push', muscle_groups: ['chest', 'shoulders', 'triceps'] as MuscleGroup[] },
      { label: 'Pull', muscle_groups: ['back', 'biceps'] as MuscleGroup[] },
    ].slice(0, days),
  }
  return templates[split] ?? templates['full_body']
}

export async function POST(req: NextRequest) {
  try {
    const { days_per_week, split_type, duration_mins, equipment, goal } = await req.json()

    const availableExercises = EXERCISES.filter(e =>
      e.equipment.some(eq => equipment.includes(eq))
    )

    const exerciseSummary = availableExercises.map(e =>
      `${e.id} | ${e.name} | muscles: ${e.muscle_groups.join(',')} | difficulty: ${e.difficulty}`
    ).join('\n')

    const dayTemplates = getDayTemplate(split_type as SplitType, days_per_week)

    const prompt = `You are designing a home gym workout plan.

User details:
- Split: ${split_type}
- Days per week: ${days_per_week}
- Session duration: ${duration_mins} minutes
- Goal: ${goal}
- Equipment: ${equipment.join(', ')}

Available exercises (id | name | muscles | difficulty):
${exerciseSummary}

Day structure:
${dayTemplates.map((d, i) => `Day ${i + 1}: ${d.label} — targets: ${d.muscle_groups.join(', ')}`).join('\n')}

Rules:
- For ${duration_mins} min sessions, assign ${duration_mins <= 30 ? '4-5' : duration_mins <= 45 ? '5-6' : duration_mins <= 60 ? '6-8' : '8-10'} exercises per day
- Goal "${goal}": ${goal === 'strength' ? 'prioritize compound movements, 4-6 reps' : goal === 'hypertrophy' ? 'mix of compounds and isolation, 8-12 reps' : goal === 'endurance' ? 'higher reps 15-20, shorter rest' : 'circuit-friendly, high reps 12-15'}
- Only use exercises from the list above with appropriate muscles for each day
- Include at least 1 core exercise per full-body or lower-body day
- Vary exercises across days
- Assign sets and reps appropriate for the goal

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "plan_name": "string",
  "days": [
    {
      "label": "string",
      "exercises": [
        {"exercise_id": "string", "sets": number, "reps": "string", "rest_seconds": number}
      ]
    }
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
    try {
      aiPlan = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid response. Try again.' }, { status: 500 })
    }

    const spacing = Math.floor(7 / days_per_week)

    // Build the full plan object to return (client will save to localStorage)
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
        day_of_week: (i * spacing) % 7,
        label: dayTemplates[i]?.label ?? d.label,
        muscle_groups: dayTemplates[i]?.muscle_groups ?? [],
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
