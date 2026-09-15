import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideClose?: boolean
}

const sizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
}

export function Modal({ open, onClose, title, description, icon, children, footer, size = 'md', hideClose }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cn(
              'relative w-full glass-strong shadow-glass-lg rounded-t-4xl sm:rounded-4xl',
              'max-h-[92vh] flex flex-col overflow-hidden',
              sizes[size],
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            {/* mobile grab handle */}
            <div className="sm:hidden pt-3 pb-1 grid place-items-center">
              <div className="w-10 h-1.5 rounded-full bg-ink-300" />
            </div>

            {(title || !hideClose) && (
              <div className="flex items-start gap-3 px-5 pt-4 sm:pt-5 pb-3">
                {icon && (
                  <div className="w-11 h-11 rounded-2xl grad-brand grid place-items-center text-white shrink-0 shadow-glow">
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {title && <h3 className="font-display font-bold text-lg text-ink-900 leading-snug">{title}</h3>}
                  {description && <p className="text-sm text-ink-500 mt-0.5">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-ink-500 hover:bg-overlay/[0.09] transition"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            <div className="px-5 pb-2 overflow-y-auto flex-1">{children}</div>

            {footer && <div className="px-5 py-4 border-t border-line/[0.10] flex gap-2.5 justify-end pb-safe sm:pb-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
