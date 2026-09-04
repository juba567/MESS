import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  full?: boolean
  icon?: React.ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary: 'btn-gradient',
  secondary: 'glass-strong text-ink-800 hover:bg-white/[0.10]',
  ghost: 'text-ink-600 hover:bg-white/[0.08]',
  danger: 'bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-[0_8px_24px_rgba(244,63,94,0.3)] hover:brightness-105',
  subtle: 'bg-brand-500/10 text-brand-300 hover:bg-brand-500/20',
}

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-6 py-3.5',
  icon: 'p-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, full, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})
