import { motion } from 'framer-motion'

export function PageHeader({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-3 mb-5"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-11 h-11 rounded-2xl grad-brand grid place-items-center text-white shrink-0 shadow-glow">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-2xl sm:text-[26px] text-ink-900 leading-tight truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-ink-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </motion.div>
  )
}
