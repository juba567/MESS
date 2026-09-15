import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export function Menu({
  trigger,
  children,
  align = 'right',
  width = 'w-56',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-2 glass-strong rounded-2xl shadow-glass-lg p-1.5 overflow-hidden',
              width,
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left',
        danger ? 'text-rose-700 dark:text-rose-400 hover:bg-rose-500/10' : 'text-ink-700 hover:bg-overlay/[0.09]',
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
