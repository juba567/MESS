import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export type Theme = 'light' | 'dark'

/** localStorage key for the persisted UI slice (theme only). */
export const THEME_KEY = 'mess-ui'

/**
 * Resolve the theme to use before React renders: a previously saved choice, else
 * the OS preference, else light (the featured design). Reads the same persisted
 * envelope the store hydrates from, so main.tsx (no-flash) and the store agree.
 */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    if (raw) {
      const saved = JSON.parse(raw)?.state?.theme
      if (saved === 'light' || saved === 'dark') return saved
    }
  } catch {
    /* ignore malformed storage */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface UIState {
  toasts: Toast[]
  confirmReq: ConfirmState | null
  quickAction: QuickAction
  theme: Theme
  toast: (text: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  _resolve: (ok: boolean) => void
  openQuick: (q: QuickAction) => void
  closeQuick: () => void
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

let seq = 1

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      toasts: [],
      confirmReq: null,
      quickAction: null,
      theme: getInitialTheme(),
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
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: THEME_KEY,
      // Persist only the theme — toasts/confirm/quickAction are transient
      // (confirmReq even holds a live resolve function).
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
)
