import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, Shield, UtensilsCrossed, Wallet, Receipt, Coins, Sunset, Moon, Users2, Palmtree } from 'lucide-react'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Avatar, Badge, Button, Stat, EmptyState } from '@/components/ui'
import { useMonthState, useMonthSummary } from '@/hooks/useMonth'
import { useMembers } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { taka } from '@/lib/format'
import { shortDate, longDate, monthLabel, betweenInclusive, todayISO } from '@/lib/date'
import { ROLE_LABEL, ROLE_BADGE } from '@/lib/permissions'
import { cn } from '@/lib/cn'

export function MemberAccount() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const members = useMembers()
  const member = members.find((m) => m.id === id)
  const { month, prev, next, isCurrent } = useMonthState()
  const summary = useMonthSummary(month)
  const messId = useStore((s) => s.currentMessId)
  const paymentsAll = useStore((s) => s.db.payments)
  const leavesAll = useStore((s) => s.db.leaves)

  const mm = summary?.members.find((x) => x.memberId === id)

  const payments = useMemo(
    () => paymentsAll.filter((p) => p.messId === messId && p.memberId === id && p.date.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date)),
    [paymentsAll, messId, id, month],
  )
  const leaves = useMemo(
    () => leavesAll.filter((l) => l.messId === messId && l.memberId === id).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [leavesAll, messId, id],
  )

  if (!member) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/app/members')}>Back</Button>
        <Card className="py-4"><EmptyState icon={<Users2 className="w-7 h-7" />} title="Member not found" /></Card>
      </div>
    )
  }

  const today = todayISO()
  const onLeaveNow = leaves.some((l) => betweenInclusive(today, l.startDate, l.endDate))
  const status = mm?.status ?? 'settled'

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/app/members')}>All members</Button>

      {/* Profile header */}
      <Card variant="strong" className="p-6 relative overflow-hidden sheen">
        <div className="flex items-center gap-4">
          <Avatar name={member.name} color={member.avatarColor} size="xl" ring />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-extrabold text-2xl text-ink-900 truncate">{member.name}</h1>
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-br', ROLE_BADGE[member.role])}>
                {member.role === 'owner' && <Crown className="w-3 h-3" />}
                {member.role === 'manager' && <Shield className="w-3 h-3" />}
                {ROLE_LABEL[member.role]}
              </span>
              {!member.active && <Badge tone="slate">left</Badge>}
              {onLeaveNow && <Badge tone="amber" dot>On leave</Badge>}
            </div>
            <p className="text-sm text-ink-500 mt-1">{member.contact ?? 'No contact'}</p>
            <p className="text-xs text-ink-400 mt-0.5">Joined {shortDate(member.joinedAt.slice(0, 10))}</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-ink-900">{monthLabel(month)}</h2>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
      </div>

      {/* Balance hero */}
      <Card
        variant="strong"
        className={cn(
          'p-6 bg-gradient-to-br text-white relative overflow-hidden',
          status === 'due' ? 'from-rose-500 to-red-500' : status === 'receivable' ? 'from-emerald-500 to-teal-500' : 'from-brand-500 to-violet-500',
        )}
      >
        <div className="relative">
          <p className="text-white/80 text-sm font-medium">{status === 'due' ? 'Amount to pay' : status === 'receivable' ? 'Amount receivable' : 'All settled'}</p>
          <p className="font-display font-extrabold text-4xl mt-1">{taka(Math.abs(mm?.balance ?? 0))}</p>
          <p className="text-white/80 text-sm mt-2">Paid {taka(mm?.paid ?? 0)} of {taka(mm?.totalCost ?? 0)} total cost</p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Total Meals" value={mm?.meals ?? 0} sub={`${mm?.guestMeals ?? 0} guest`} icon={<UtensilsCrossed className="w-5 h-5" />} tone="brand" />
        <Stat label="Meal Cost" value={taka(mm?.mealCost ?? 0)} sub={`Rate ${taka(summary?.mealRate ?? 0, { decimals: 2 })}`} icon={<Coins className="w-5 h-5" />} tone="violet" />
        <Stat label="Other Share" value={taka(mm?.otherCost ?? 0)} sub="shared expenses" icon={<Receipt className="w-5 h-5" />} tone="amber" />
        <Stat label="Total Cost" value={taka(mm?.totalCost ?? 0)} icon={<Receipt className="w-5 h-5" />} tone="rose" />
        <Stat label="Paid" value={taka(mm?.paid ?? 0)} sub={`${payments.length} payment${payments.length === 1 ? '' : 's'}`} icon={<Wallet className="w-5 h-5" />} tone="green" />
        <Stat label="Balance" value={taka(mm?.balance ?? 0, { sign: true })} icon={<Coins className="w-5 h-5" />} tone={status === 'due' ? 'rose' : 'green'} />
      </div>

      {/* Meal breakdown */}
      <Card className="p-5">
        <h3 className="font-display font-bold text-ink-900 mb-4">Meal breakdown</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Lunch', v: mm?.lunch ?? 0, icon: <Sunset className="w-4 h-4" />, tone: 'from-sky-500 to-cyan-500' },
            { label: 'Dinner', v: mm?.dinner ?? 0, icon: <Moon className="w-4 h-4" />, tone: 'from-violet-500 to-fuchsia-500' },
          ].map((r) => (
            <div key={r.label} className="glass-panel rounded-2xl p-4 text-center">
              <div className={cn('w-9 h-9 mx-auto rounded-xl grid place-items-center text-white bg-gradient-to-br mb-2', r.tone)}>{r.icon}</div>
              <p className="font-display font-extrabold text-2xl text-ink-900">{r.v}</p>
              <p className="text-xs text-ink-500">{r.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment history */}
      <Card className="p-5">
        <h3 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-brand-400" /> Payments this month</h3>
        {payments.length === 0 ? (
          <EmptyState icon={<Wallet className="w-7 h-7" />} title="No payments" message="No deposits recorded for this month." />
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center text-white shrink-0"><Wallet className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-800 text-sm">{p.method}</p>
                  <p className="text-xs text-ink-500">{shortDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
                </div>
                <span className="font-bold text-emerald-400">{taka(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Leaves */}
      {leaves.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2"><Palmtree className="w-4 h-4 text-brand-400" /> Leave history</h3>
          <div className="space-y-2">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-800 text-sm">{longDate(l.startDate)} → {longDate(l.endDate)}</p>
                  {l.reason && <p className="text-xs text-ink-500">{l.reason}</p>}
                </div>
                {betweenInclusive(today, l.startDate, l.endDate) && <Badge tone="amber" dot>now</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
