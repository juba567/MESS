import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'
import { useUI } from '@/lib/ui-store'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Field'

const toastIcon = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-rose-500" />,
  info: <Info className="w-5 h-5 text-brand-500" />,
}

export function ToastHost() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto glass-strong rounded-2xl shadow-glass-lg px-4 py-3 flex items-center gap-3 w-full cursor-pointer"
          >
            {toastIcon[t.kind]}
            <span className="text-sm font-medium text-ink-800">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

export function ConfirmHost() {
  const req = useUI((s) => s.confirmReq)
  const resolve = useUI((s) => s._resolve)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    setTyped('')
  }, [req?.id])

  const needsText = !!req?.requireText
  const canConfirm = !needsText || typed.trim() === req?.requireText

  return (
    <Modal
      open={!!req}
      onClose={() => resolve(false)}
      size="sm"
      icon={req?.danger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
      title={req?.title}
      footer={
        <>
          <Button variant="ghost" onClick={() => resolve(false)}>
            {req?.cancelText || 'Cancel'}
          </Button>
          <Button variant={req?.danger ? 'danger' : 'primary'} disabled={!canConfirm} onClick={() => resolve(true)}>
            {req?.confirmText || 'Confirm'}
          </Button>
        </>
      }
    >
      {req?.message && <p className="text-[15px] text-ink-600 leading-relaxed">{req.message}</p>}
      {needsText && (
        <div className="mt-4">
          <p className="text-xs text-ink-500 mb-1.5">
            Type <span className="font-bold text-ink-800">{req?.requireText}</span> to confirm
          </p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={req?.requireText} autoFocus />
        </div>
      )}
    </Modal>
  )
}
