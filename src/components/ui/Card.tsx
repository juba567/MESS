import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'default' | 'strong' | 'panel' | 'plain'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  hover?: boolean
}

const variantClass: Record<Variant, string> = {
  default: 'glass',
  strong: 'glass-strong',
  panel: 'glass-panel',
  plain: 'bg-white/[0.09]',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', hover = false, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        variantClass[variant],
        'rounded-3xl',
        hover && 'transition-all duration-300 hover:shadow-glass-lg hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    />
  )
})

export function SectionTitle({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white shrink-0 shadow-glow">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg text-ink-900 leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-sm text-ink-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
