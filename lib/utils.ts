import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function totalVolume(sets: { reps: number; weight_kg: number }[]): number {
  return sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0)
}
