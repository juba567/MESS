import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, UtensilsCrossed, Wallet, PieChart, Shield } from 'lucide-react'
import { Aurora } from '@/components/layout/AppShell'

const FEATURES = [
  { icon: <UtensilsCrossed className="w-5 h-5" />, title: 'Meals & guests', desc: 'Track daily meals with a live meal rate.' },
  { icon: <Wallet className="w-5 h-5" />, title: 'Bazar & expenses', desc: 'Log bazar and shared bills in seconds.' },
  { icon: <PieChart className="w-5 h-5" />, title: 'Fair settlements', desc: 'Auto-calculated who owes whom, monthly.' },
  { icon: <Shield className="w-5 h-5" />, title: 'Roles & control', desc: 'Owner, manager and member permissions.' },
]

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-stretch">
      <Aurora />

      {/* Brand / features panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] max-w-xl p-12 relative">
        <Link to="/login" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl grad-brand grid place-items-center text-white shadow-glow">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-display font-extrabold text-xl text-ink-900">Mess Manager</span>
        </Link>

        <div>
          <h1 className="font-display font-extrabold text-4xl text-ink-900 leading-tight">
            Run your mess like a <span className="gradient-text">pro</span>.
          </h1>
          <p className="text-ink-600 mt-3 text-lg max-w-md">
            Meals, bazar, expenses and monthly settlements — beautifully organized for shared bachelor living.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="glass rounded-3xl p-4"
              >
                <div className="w-10 h-10 rounded-2xl grad-brand grid place-items-center text-white mb-3">
                  {f.icon}
                </div>
                <p className="font-display font-bold text-ink-900">{f.title}</p>
                <p className="text-sm text-ink-500 mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-ink-400">Made for bachelor messes in Bangladesh · ৳ BDT</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-11 h-11 rounded-2xl grad-brand grid place-items-center text-white shadow-glow">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="font-display font-extrabold text-xl text-ink-900">Mess Manager</span>
          </div>

          <div className="glass-strong rounded-4xl shadow-glass-lg p-6 sm:p-8">
            <h2 className="font-display font-extrabold text-2xl text-ink-900">{title}</h2>
            <p className="text-ink-500 mt-1 mb-6">{subtitle}</p>
            {children}
          </div>
          {footer && <div className="text-center mt-5 text-sm text-ink-500">{footer}</div>}
        </motion.div>
      </div>
    </div>
  )
}
