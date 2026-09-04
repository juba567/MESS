import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

// ---- Segmented control ----
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={cn('inline-flex p-1 rounded-2xl bg-white/[0.06] border border-white/[0.10] gap-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-glow' : 'text-ink-600 hover:bg-white/[0.09]',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ---- Stepper (+/-) ----
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9,
  tone = 'brand',
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  tone?: 'brand' | 'slate'
}) {
  const active = value > 0
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl border transition-colors',
        active && tone === 'brand' ? 'bg-brand-500/10 border-brand-300' : 'bg-white/[0.06] border-white/[0.10]',
      )}
    >
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-9 h-9 grid place-items-center rounded-l-2xl text-ink-500 hover:bg-white/[0.09] disabled:opacity-30 transition"
        aria-label="Decrease"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className={cn('w-8 text-center font-bold tabular-nums', active ? 'text-brand-300' : 'text-ink-400')}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 grid place-items-center rounded-r-2xl text-ink-500 hover:bg-white/[0.09] disabled:opacity-30 transition"
        aria-label="Increase"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

// ---- Empty state ----
export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  message?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('text-center py-12 px-6 flex flex-col items-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-brand-500/15 to-violet-500/15 grid place-items-center text-brand-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-display font-bold text-ink-800">{title}</h3>
      {message && <p className="text-sm text-ink-500 mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ---- Filter chip ----
export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border',
        active
          ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white border-transparent shadow-glow'
          : 'bg-white/[0.06] text-ink-600 border-white/[0.10] hover:bg-white/[0.10]',
      )}
    >
      {children}
    </button>
  )
}

// ---- Progress bar ----
export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'green' | 'amber' | 'rose'; className?: string }) {
  const tones = {
    brand: 'from-brand-500 to-violet-500',
    green: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-400 to-orange-500',
    rose: 'from-rose-500 to-red-500',
  }
  return (
    <div className={cn('h-2 rounded-full bg-ink-200/60 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
