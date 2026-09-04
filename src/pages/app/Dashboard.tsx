import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, UtensilsCrossed, ShoppingCart, Receipt, Wallet, Coins,
  TrendingUp, TrendingDown, Plus, Palmtree, FileBarChart, ArrowRight, Users2, PiggyBank,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Stat, Badge, Avatar, Button, EmptyState } from '@/components/ui'
import { useMonthState, useMonthSummary } from '@/hooks/useMonth'
import { useMess, useCurrentMember } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI, type QuickAction } from '@/lib/ui-store'
import { taka } from '@/lib/format'
import { monthLabel, relativeTime, betweenInclusive, todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'

const QUICK: { key: Exclude<QuickAction, null> | 'report'; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: 'meal', label: 'Add Meal', icon: <UtensilsCrossed className="w-5 h-5" />, tone: 'from-brand-500 to-violet-500' },
  { key: 'bazar', label: 'Add Bazar', icon: <ShoppingCart className="w-5 h-5" />, tone: 'from-emerald-500 to-teal-500' },
  { key: 'expense', label: 'Add Expense', icon: <Receipt className="w-5 h-5" />, tone: 'from-amber-400 to-orange-500' },
  { key: 'payment', label: 'Payment', icon: <Wallet className="w-5 h-5" />, tone: 'from-sky-500 to-cyan-500' },
  { key: 'leave', label: 'Take Leave', icon: <Palmtree className="w-5 h-5" />, tone: 'from-fuchsia-500 to-pink-500' },
  { key: 'report', label: 'View Report', icon: <FileBarChart className="w-5 h-5" />, tone: 'from-violet-500 to-indigo-500' },
]

export function Dashboard() {
  const navigate = useNavigate()
  const mess = useMess()
  const me = useCurrentMember()
  const { month, prev, next, isCurrent } = useMonthState()
  const summary = useMonthSummary(month)
  const openQuick = useUI((s) => s.openQuick)

  const activities = useStore((s) => s.db.activities.filter((a) => a.messId === s.currentMessId).slice(0, 6))
  const leaves = useStore((s) => s.db.leaves.filter((l) => l.messId === s.currentMessId))
  const today = todayISO()
  const onLeaveToday = leaves.filter((l) => betweenInclusive(today, l.startDate, l.endDate))

  if (!summary || !mess) return null
  const mine = summary.members.find((m) => m.memberId === me?.id)

  const statusTone = mine?.status === 'due' ? 'rose' : mine?.status === 'receivable' ? 'green' : 'slate'
  const statusText = mine?.status === 'due' ? 'You owe' : mine?.status === 'receivable' ? 'You’ll receive' : 'All settled'

  return (
    <div className="space-y-6">
      <PageHeader title={`${mess.name}`} subtitle={monthLabel(month)} icon={<UtensilsCrossed className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
      </PageHeader>

      {/* Your balance hero + collection summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card variant="strong" className="p-6 sm:p-7 h-full relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-gradient-to-br from-brand-500/20 to-violet-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-500">Your balance · {monthLabel(month)}</p>
                <Badge tone={statusTone as any} dot>{statusText}</Badge>
              </div>
              <p className={cn('mt-2 font-display font-extrabold text-4xl sm:text-5xl tracking-tight',
                mine?.status === 'due' ? 'text-rose-400' : mine?.status === 'receivable' ? 'text-emerald-400' : 'text-ink-800')}>
                {taka(Math.abs(mine?.balance ?? 0))}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <MiniStat label="Your meals" value={mine?.meals ?? 0} />
                <MiniStat label="Your cost" value={taka(mine?.totalCost ?? 0)} />
                <MiniStat label="You paid" value={taka(mine?.paid ?? 0)} />
              </div>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => openQuick('payment')} icon={<Wallet className="w-4 h-4" />}>Add payment</Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('/app/settlements')} icon={<ArrowRight className="w-4 h-4" />}>Settlements</Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <Stat label="Meal Rate" value={taka(summary.mealRate, { decimals: 2 })} sub={`${summary.totalMeals} meals total`} icon={<Coins className="w-5 h-5" />} tone="violet" />
          <Stat label="Collected" value={taka(summary.totalCollected)} sub={`of ${taka(summary.totalCost)} cost`} icon={<PiggyBank className="w-5 h-5" />} tone="green" />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-semibold text-ink-500 mb-3">Quick actions</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK.map((q, i) => (
            <motion.button
              key={q.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => (q.key === 'report' ? navigate('/app/reports') : openQuick(q.key as QuickAction))}
              className="glass rounded-3xl p-3 sm:p-4 flex flex-col items-center gap-2 hover:shadow-glass hover:-translate-y-0.5 transition active:scale-95"
            >
              <div className={cn('w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br', q.tone)}>{q.icon}</div>
              <span className="text-xs font-semibold text-ink-700 text-center leading-tight">{q.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Members" value={summary.memberCount} sub={`${summary.activeMemberCount} active`} icon={<Users className="w-5 h-5" />} tone="brand" />
        <Stat label="Total Meals" value={summary.totalMeals} sub={`${summary.guestMeals} guest meals`} icon={<UtensilsCrossed className="w-5 h-5" />} tone="sky" />
        <Stat label="Bazar Cost" value={taka(summary.totalBazar)} sub={`+ ${taka(summary.mealExpenses)} meal bills`} icon={<ShoppingCart className="w-5 h-5" />} tone="green" />
        <Stat label="Other Expenses" value={taka(summary.otherExpenses)} sub="split equally" icon={<Receipt className="w-5 h-5" />} tone="amber" />
        <Stat label="Total Cost" value={taka(summary.totalCost)} sub={`${monthLabel(month)}`} icon={<Coins className="w-5 h-5" />} tone="violet" />
        <Stat label="Money Collected" value={taka(summary.totalCollected)} icon={<Wallet className="w-5 h-5" />} tone="sky" />
        <Stat label="Total Due" value={taka(summary.totalDue)} sub="members owe" icon={<TrendingDown className="w-5 h-5" />} tone="rose" />
        <Stat label="Receivable" value={taka(summary.totalReceivable)} sub="members overpaid" icon={<TrendingUp className="w-5 h-5" />} tone="green" />
      </div>

      {/* Members balances + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-ink-900 flex items-center gap-2"><Users2 className="w-4 h-4 text-brand-400" /> Member balances</h2>
            <button onClick={() => navigate('/app/members')} className="text-sm font-semibold text-brand-300 hover:underline">View all</button>
          </div>
          <div className="space-y-1.5">
            {summary.members.map((m) => (
              <button
                key={m.memberId}
                onClick={() => navigate(`/app/members/${m.memberId}`)}
                className="w-full flex items-center gap-3 py-2 px-2 rounded-2xl hover:bg-white/[0.08] transition text-left"
              >
                <Avatar name={m.member.name} color={m.member.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-800 text-sm truncate">{m.member.name}</p>
                  <p className="text-xs text-ink-500">{m.meals} meals · paid {taka(m.paid)}</p>
                </div>
                <span className={cn('font-bold text-sm tabular-nums', m.status === 'due' ? 'text-rose-400' : m.status === 'receivable' ? 'text-emerald-400' : 'text-ink-400')}>
                  {m.status === 'settled' ? '—' : taka(Math.abs(m.balance))}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-ink-900">Recent activity</h2>
            <button onClick={() => navigate('/app/activity')} className="text-sm font-semibold text-brand-300 hover:underline">View all</button>
          </div>

          {onLeaveToday.length > 0 && (
            <div className="mb-4 glass-panel rounded-2xl p-3 flex items-center gap-2 text-sm">
              <Palmtree className="w-4 h-4 text-fuchsia-500 shrink-0" />
              <span className="text-ink-600">
                On leave today: <span className="font-semibold text-ink-800">{onLeaveToday.map((l) => summary.members.find((m) => m.memberId === l.memberId)?.member.name ?? '—').join(', ')}</span>
              </span>
            </div>
          )}

          {activities.length === 0 ? (
            <EmptyState title="No activity yet" message="Actions in your mess will show up here." />
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.09] grid place-items-center shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-700"><span className="font-semibold text-ink-900">{a.actorName}</span> {a.text}</p>
                    <p className="text-xs text-ink-400">{relativeTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl px-3 py-2.5">
      <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide">{label}</p>
      <p className="font-display font-bold text-ink-900 text-lg mt-0.5">{value}</p>
    </div>
  )
}
