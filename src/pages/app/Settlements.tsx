import { useMemo } from 'react'
import { ArrowLeftRight, PiggyBank, CheckCircle2, Circle, Handshake, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Avatar, Badge, Stat, EmptyState } from '@/components/ui'
import { useMonthState, useMonthSummary, useSettlement } from '@/hooks/useMonth'
import { useMembers, useCan } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { taka } from '@/lib/format'
import { monthLabel } from '@/lib/date'
import { FUND_ID, FUND_NAME, settleKey } from '@/lib/calc'
import { cn } from '@/lib/cn'

export function Settlements() {
  const { month, prev, next, isCurrent } = useMonthState()
  const summary = useMonthSummary(month)
  const txns = useSettlement(summary)
  const members = useMembers()
  const can = useCan()
  const canManage = can('manageSettlements')
  const messId = useStore((s) => s.currentMessId)
  const settlementsAll = useStore((s) => s.db.settlements)
  const toggleSettlement = useStore((s) => s.toggleSettlement)
  const toast = useUI((s) => s.toast)

  const info = (id: string) => (id === FUND_ID ? { name: FUND_NAME, color: 'linear-gradient(135deg,#10b981,#14b8a6)', fund: true } : { name: members.find((m) => m.id === id)?.name ?? '—', color: members.find((m) => m.id === id)?.avatarColor, fund: false })

  const settledMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    settlementsAll.filter((s) => s.messId === messId && s.month === month).forEach((s) => (map[settleKey(s.month, s.fromMemberId, s.toMemberId)] = s.settled))
    return map
  }, [settlementsAll, messId, month])

  const isSettled = (fromId: string, toId: string) => settledMap[settleKey(month, fromId, toId)] ?? false
  const settledCount = txns.filter((t) => isSettled(t.fromId, t.toId)).length
  const pendingAmount = txns.filter((t) => !isSettled(t.fromId, t.toId)).reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Settlement" subtitle={monthLabel(month)} icon={<ArrowLeftRight className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Transfers needed" value={txns.length} icon={<Handshake className="w-5 h-5" />} tone="brand" />
        <Stat label="Settled" value={`${settledCount}/${txns.length}`} icon={<CheckCircle2 className="w-5 h-5" />} tone="green" />
        <Stat label="Pending amount" value={taka(pendingAmount)} icon={<ArrowLeftRight className="w-5 h-5" />} tone="amber" />
        <Stat label="Collected" value={taka(summary?.totalCollected ?? 0)} sub={`of ${taka(summary?.totalCost ?? 0)}`} icon={<PiggyBank className="w-5 h-5" />} tone="sky" />
      </div>

      <Card className="p-5 bg-gradient-to-br from-brand-500/8 to-violet-500/8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white shrink-0"><Sparkles className="w-5 h-5" /></div>
          <div>
            <p className="font-semibold text-ink-800">Smart settlement</p>
            <p className="text-sm text-ink-500 mt-0.5">These are the fewest transfers that clear everyone's balance for {monthLabel(month)}. Payments to or from the <span className="font-semibold text-emerald-300">{FUND_NAME}</span> cover the gap between what was collected and spent.</p>
          </div>
        </div>
      </Card>

      {txns.length === 0 ? (
        <Card className="py-4">
          <EmptyState icon={<CheckCircle2 className="w-7 h-7" />} title="Everyone's settled" message="No transfers are needed for this month — all balances are square." />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {txns.map((t) => {
            const from = info(t.fromId)
            const to = info(t.toId)
            const settled = isSettled(t.fromId, t.toId)
            return (
              <Card key={`${t.fromId}-${t.toId}`} className={cn('p-4 transition', settled && 'opacity-70')}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {from.fund ? <FundBadge /> : <Avatar name={from.name} color={from.color} size="sm" />}
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-800 text-sm truncate">{from.name}</p>
                      <p className="text-[11px] text-ink-400">pays</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center px-2 shrink-0">
                    <span className={cn('font-display font-extrabold text-lg', settled ? 'text-ink-400 line-through' : 'text-ink-900')}>{taka(t.amount)}</span>
                    <ArrowLeftRight className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-800 text-sm truncate">{to.name}</p>
                      <p className="text-[11px] text-ink-400">receives</p>
                    </div>
                    {to.fund ? <FundBadge /> : <Avatar name={to.name} color={to.color} size="sm" />}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.10] flex items-center justify-between">
                  {settled ? <Badge tone="green" dot>Settled</Badge> : <Badge tone="amber" dot>Pending</Badge>}
                  {canManage ? (
                    <button
                      onClick={() => { toggleSettlement({ month, fromId: t.fromId, toId: t.toId, amount: t.amount, settled: !settled }); toast(settled ? 'Marked pending' : 'Marked as settled') }}
                      className={cn('inline-flex items-center gap-1.5 text-sm font-semibold transition', settled ? 'text-ink-400 hover:text-ink-600' : 'text-emerald-400 hover:text-emerald-300')}
                    >
                      {settled ? <><Circle className="w-4 h-4" /> Undo</> : <><CheckCircle2 className="w-4 h-4" /> Mark settled</>}
                    </button>
                  ) : (
                    <span className="text-xs text-ink-400">Only managers can settle</span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FundBadge() {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center text-white shrink-0 ring-2 ring-white/[0.18]">
      <PiggyBank className="w-4 h-4" />
    </div>
  )
}
