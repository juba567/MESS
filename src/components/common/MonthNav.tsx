import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthLabel } from '@/lib/date'
import type { Month } from '@/lib/types'
import { cn } from '@/lib/cn'

export function MonthNav({
  month,
  onPrev,
  onNext,
  canNext = true,
  className,
}: {
  month: Month
  onPrev: () => void
  onNext: () => void
  canNext?: boolean
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center glass rounded-2xl p-1 shadow-glass-sm', className)}>
      <button
        onClick={onPrev}
        className="w-9 h-9 grid place-items-center rounded-xl text-ink-600 hover:bg-overlay/[0.09] transition"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="px-3 min-w-[130px] text-center font-display font-bold text-ink-900 text-sm">
        {monthLabel(month)}
      </span>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="w-9 h-9 grid place-items-center rounded-xl text-ink-600 hover:bg-overlay/[0.09] transition disabled:opacity-30 disabled:pointer-events-none"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
