import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

interface AvatarProps {
  name: string
  color?: string // css gradient
  url?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  className?: string
}

const sizeMap = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl',
}

export function Avatar({ name, color, url, size = 'md', ring, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full grid place-items-center font-bold text-white shrink-0 overflow-hidden',
        sizeMap[size],
        ring && 'ring-2 ring-white/[0.18] shadow-glass-sm',
        className,
      )}
      style={{ background: url ? undefined : color || 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
    >
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : initials(name)}
    </div>
  )
}
