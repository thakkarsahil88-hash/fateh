import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk' // eslint-disable-line
import { createClient } from '@supabase/supabase-js'
import { EXERCISES } from '@/lib/exercises'
import type { SplitType, Equipment, MuscleGroup } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Map split type + days to day labels and muscle groups
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
  const supabase = getSupabase()
  const body = await req.json()
  const { phone, days_per_week, split_type, duration_mins, equipment, goal } = body as {
    phone: string
    days_per_week: number
    split_type: SplitType
    duration_mins: number
    equipment: Equipment[]
    goal: string
  }

  // Get exercises available for this equipment
  const availableExercises = EXERCISES.filter(e =>
    e.equipment.some(eq => (equipment as string[]).includes(eq))
  )

  const exerciseSummary = availableExercises.map(e =>
    `${e.id} | ${e.name} | muscles: ${e.muscle_groups.join(',')} | difficulty: ${e.difficulty}`
  ).join('\n')

  const dayTemplates = getDayTemplate(split_type, days_per_week)

  // Ask Claude to assign exercises to each day
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
- Vary exercises across days (don't repeat the same exercise on consecutive days)
- Assign sets and reps appropriate for the goal

Respond with ONLY valid JSON, no markdown:
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
  // Strip markdown code fences if Claude wrapped the JSON
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  let planData: any
  try {
    planData = JSON.parse(cleaned)
  } catch {
    console.error('Raw AI response:', rawText)
    return NextResponse.json({ error: `Failed to parse AI response: ${rawText.slice(0, 200)}` }, { status: 500 })
  }

  // Save plan to Supabase
  const { data: plan, error: planError } = await supabase
    .from('fateh_plans')
    .insert({
      phone,
      name: planData.plan_name ?? `${split_type} Plan`,
      split_type,
      days_per_week,
      duration_mins,
      equipment,
      goal,
    })
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  const spacing = Math.floor(7 / days_per_week)

  for (let i = 0; i < planData.days.length; i++) {
    const dayInfo = planData.days[i]
    const template = dayTemplates[i]
    const { data: planDay, error: dayError } = await supabase
      .from('fateh_plan_days')
      .insert({
        plan_id: plan.id,
        day_of_week: (i * spacing) % 7,
        label: template.label,
        muscle_groups: template.muscle_groups,
        sort_order: i,
      })
      .select()
      .single()

    if (dayError) continue

    const exerciseRows = dayInfo.exercises.map((ex: any, j: number) => ({
      plan_day_id: planDay.id,
      exercise_id: ex.exercise_id,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds ?? 60,
      sort_order: j,
    }))

    await supabase.from('fateh_plan_exercises').insert(exerciseRows)
  }

  // Set as current plan on profile
  await supabase.from('fateh_profiles').update({ current_plan_id: plan.id }).eq('phone', phone)

  return NextResponse.json({ plan_id: plan.id })
  } catch (e: any) {
    console.error('plan-generate error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
