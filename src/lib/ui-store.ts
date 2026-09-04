import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  kind: ToastKind
  text: string
}

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  /** require typing this exact text to enable confirm (for destructive ops) */
  requireText?: string
}

interface ConfirmState extends ConfirmOptions {
  id: number
  resolve: (ok: boolean) => void
}

export type QuickAction = 'meal' | 'bazar' | 'expense' | 'payment' | 'guest' | 'leave' | 'invite' | null

interface UIState {
  toasts: Toast[]
  confirmReq: ConfirmState | null
  quickAction: QuickAction
  toast: (text: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  _resolve: (ok: boolean) => void
  openQuick: (q: QuickAction) => void
  closeQuick: () => void
}

let seq = 1

export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  confirmReq: null,
  quickAction: null,
  toast: (text, kind = 'success') => {
    const id = seq++
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }))
    setTimeout(() => get().dismiss(id), 3600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({ confirmReq: { ...opts, id: seq++, resolve } })
    }),
  _resolve: (ok) => {
    const req = get().confirmReq
    if (req) req.resolve(ok)
    set({ confirmReq: null })
  },
  openQuick: (q) => set({ quickAction: q }),
  closeQuick: () => set({ quickAction: null }),
}))
