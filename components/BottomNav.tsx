'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, BarChart2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/home', label: 'Home', Icon: Home },
  { href: '/workout', label: 'Workout', Icon: Dumbbell },
  { href: '/progress', label: 'Progress', Icon: BarChart2 },
  { href: '/plan', label: 'Plan', Icon: Calendar },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 safe-bottom max-w-lg mx-auto">
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                active ? 'text-orange-400' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
