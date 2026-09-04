import { Card } from './Card'
import { cn } from '@/lib/cn'

interface StatProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: React.ReactNode
  tone?: 'brand' | 'green' | 'amber' | 'rose' | 'sky' | 'violet'
  className?: string
}

const toneBg: Record<NonNullable<StatProps['tone']>, string> = {
  brand: 'from-brand-500 to-violet-500',
  green: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-500 to-red-500',
  sky: 'from-sky-500 to-cyan-500',
  violet: 'from-violet-500 to-fuchsia-500',
}

export function Stat({ label, value, sub, icon, tone = 'brand', className }: StatProps) {
  return (
    <Card hover className={cn('p-4 sm:p-5 sheen', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-[13px] font-semibold text-ink-500 uppercase tracking-wide">{label}</p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl grid place-items-center text-white bg-gradient-to-br shrink-0', toneBg[tone])}>
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 font-display font-extrabold text-2xl sm:text-[28px] text-ink-900 leading-none tracking-tight">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-ink-500">{sub}</p>}
    </Card>
  )
}
