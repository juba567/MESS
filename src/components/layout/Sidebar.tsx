import { NavLink } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import { NAV } from './nav'
import { useMess } from '@/hooks/useMess'
import { useUI } from '@/lib/ui-store'
import { cn } from '@/lib/cn'

export function Sidebar() {
  const mess = useMess()
  const openQuick = useUI((s) => s.openQuick)

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col p-4 z-30">
      <div className="glass-strong rounded-4xl flex-1 flex flex-col p-4 shadow-glass">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-2xl grad-brand grid place-items-center text-white shadow-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-extrabold text-ink-900 leading-tight">Mess Manager</p>
            <p className="text-xs text-ink-500 truncate">{mess?.name ?? 'No mess'}</p>
          </div>
        </div>

        <button
          onClick={() => openQuick('meal')}
          className="btn-gradient mt-4 mb-3 rounded-2xl py-3 flex items-center justify-center gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" /> Quick Add
        </button>

        <nav className="flex-1 overflow-y-auto no-scrollbar -mx-1 px-1 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all group',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/15 to-brand-600/10 dark:to-violet-500/10 text-brand-700 dark:text-brand-300'
                    : 'text-ink-600 hover:bg-overlay/[0.08]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('w-[18px] h-[18px] transition', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 group-hover:text-ink-600')}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pt-3 mt-2 border-t border-line/[0.10] px-2">
          <p className="text-[11px] text-ink-400">Mess code</p>
          <p className="font-mono font-bold tracking-widest text-ink-800">{mess?.code ?? '—'}</p>
        </div>
      </div>
    </aside>
  )
}
