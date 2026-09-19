import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

const GAP = 8 // breathing room between the trigger and the menu
const EDGE = 8 // keep the menu clear of the viewport edges

interface Placement {
  top: number
  left: number
  maxHeight: number
  origin: string
}

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
  const [place, setPlace] = useState<Placement | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // The menu is portalled to <body> and placed in viewport coordinates because
  // every card is its own stacking context — `.glass*` sets backdrop-filter — so
  // an absolutely positioned dropdown nested in one card paints *underneath* the
  // next card however high its z-index is. Going through the portal also frees it
  // from any `overflow: hidden` ancestor.
  const position = useCallback(() => {
    const t = ref.current?.getBoundingClientRect()
    const m = menuRef.current
    if (!t || !m) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const below = vh - t.bottom - GAP - EDGE
    const above = t.top - GAP - EDGE
    // Drop upwards only when the menu genuinely doesn't fit below and fits better above.
    const flip = m.offsetHeight > below && above > below

    const wanted = align === 'right' ? t.right - m.offsetWidth : t.left
    setPlace({
      top: flip ? Math.max(EDGE, t.top - GAP - m.offsetHeight) : t.bottom + GAP,
      left: Math.min(Math.max(EDGE, wanted), Math.max(EDGE, vw - m.offsetWidth - EDGE)),
      maxHeight: Math.max(120, flip ? above : below),
      origin: `${flip ? 'bottom' : 'top'} ${align}`,
    })
  }, [align])

  // Measure before paint so the menu never flashes at a stale position. The last
  // placement is kept on close so the exit animation plays where it opened.
  useLayoutEffect(() => {
    if (open) position()
  }, [open, position])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)

    // Follow the trigger while the page scrolls — capture, so scrolling containers
    // count too; one recompute per frame at most.
    let raf = 0
    const follow = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        position()
      })
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open, position])

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                top: place?.top ?? 0,
                left: place?.left ?? 0,
                maxHeight: place?.maxHeight,
                transformOrigin: place?.origin,
                visibility: place ? 'visible' : 'hidden',
              }}
              className={cn(
                'fixed z-50 glass-strong rounded-2xl shadow-glass-lg p-1.5 overflow-y-auto overscroll-contain',
                width,
              )}
            >
              {children(() => setOpen(false))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
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
