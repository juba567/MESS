import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MoreHorizontal,
  Plus,
  UtensilsCrossed,
  ShoppingCart,
  Receipt,
  Wallet,
  Users2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MOBILE_NAV, NAV } from './nav'
import { useUI, type QuickAction } from '@/lib/ui-store'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'

const QUICK: { key: Exclude<QuickAction, null>; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: 'meal', label: 'Add Meal', icon: <UtensilsCrossed className="w-5 h-5" />, tone: 'from-brand-500 to-violet-500' },
  { key: 'bazar', label: 'Add Bazar', icon: <ShoppingCart className="w-5 h-5" />, tone: 'from-emerald-500 to-teal-500' },
  { key: 'expense', label: 'Add Expense', icon: <Receipt className="w-5 h-5" />, tone: 'from-amber-400 to-orange-500' },
  { key: 'payment', label: 'Add Payment', icon: <Wallet className="w-5 h-5" />, tone: 'from-sky-500 to-cyan-500' },
  { key: 'guest', label: 'Add Guest Meal', icon: <Users2 className="w-5 h-5" />, tone: 'from-fuchsia-500 to-pink-500' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const openQuick = useUI((s) => s.openQuick)
  const [moreOpen, setMoreOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const moreItems = NAV.filter((n) => !MOBILE_NAV.some((m) => m.to === n.to))

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setAddOpen(true)}
        className="lg:hidden fixed z-40 right-5 bottom-24 w-14 h-14 rounded-2xl btn-gradient grid place-items-center shadow-glass-lg active:scale-95 transition"
        aria-label="Quick add"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="glass-strong rounded-3xl mb-3 mx-auto max-w-md shadow-glass-lg grid grid-cols-5 h-[68px] px-1">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition',
                  isActive ? 'text-brand-300' : 'text-ink-400',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn('grid place-items-center transition', isActive && 'scale-110')}>
                    <item.icon className="w-[22px] h-[22px]" />
                  </div>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold text-ink-400"
          >
            <MoreHorizontal className="w-[22px] h-[22px]" />
            More
          </button>
        </div>
      </nav>

      {/* Quick add sheet */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Quick add" hideClose>
        <div className="grid grid-cols-2 gap-3 pb-2">
          {QUICK.map((q, i) => (
            <motion.button
              key={q.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                setAddOpen(false)
                openQuick(q.key)
              }}
              className="glass rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-glass transition text-left active:scale-95"
            >
              <div className={cn('w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br', q.tone)}>
                {q.icon}
              </div>
              <span className="font-semibold text-ink-800 text-sm">{q.label}</span>
            </motion.button>
          ))}
        </div>
      </Modal>

      {/* More sheet */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="grid grid-cols-3 gap-3 pb-2">
          {moreItems.map((item) => (
            <button
              key={item.to}
              onClick={() => {
                setMoreOpen(false)
                navigate(item.to)
              }}
              className="glass rounded-2xl py-4 flex flex-col items-center gap-2 hover:shadow-glass transition active:scale-95"
            >
              <item.icon className="w-6 h-6 text-brand-400" />
              <span className="text-xs font-semibold text-ink-700">{item.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
