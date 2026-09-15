import { cn } from '@/lib/cn'

type Tone = 'brand' | 'green' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-500/15 text-brand-700 dark:text-brand-300',
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  slate: 'bg-slate-400/15 text-slate-700 dark:text-slate-300',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
}

export function Badge({
  children,
  tone = 'slate',
  className,
  dot,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
