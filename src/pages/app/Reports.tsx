import { FileBarChart, Download, Printer, TrendingUp, Coins, UtensilsCrossed, ShoppingCart, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Stat, Avatar, Badge, Button, EmptyState } from '@/components/ui'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { useMonthState, useMonthSummary } from '@/hooks/useMonth'
import { useMess } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { taka } from '@/lib/format'
import { monthLabel } from '@/lib/date'
import { toCSV, download } from '@/lib/csv'
import { printMonthReport } from '@/lib/report-doc'
import { cn } from '@/lib/cn'
import { useMemo } from 'react'

export function Reports() {
  const { month, prev, next, isCurrent } = useMonthState()
  const summary = useMonthSummary(month)
  const mess = useMess()
  const bazarsAll = useStore((s) => s.db.bazars)
  const expensesAll = useStore((s) => s.db.expenses)
  const messId = useStore((s) => s.currentMessId)

  const catTotals = useMemo(() => {
    const map: Record<string, number> = {}
    bazarsAll
      .filter((b) => b.messId === messId && b.date.slice(0, 7) === month)
      .forEach((b) => b.items.forEach((it) => (map[it.category] = (map[it.category] || 0) + it.price)))
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [bazarsAll, messId, month])

  if (!summary) return null

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      [`Mess Report — ${mess?.name ?? ''}`, monthLabel(month)],
      [],
      ['Member', 'Lunch', 'Dinner', 'Guest', 'Total Meals', 'Meal Cost', 'Other Cost', 'Total Cost', 'Paid', 'Balance', 'Status'],
      ...summary.members.map((m) => [m.member.name, m.lunch, m.dinner, m.guestMeals, m.meals, m.mealCost, m.otherCost, m.totalCost, m.paid, m.balance, m.status]),
      [],
      ['Totals', '', '', summary.guestMeals, summary.totalMeals, '', '', summary.totalCost, summary.totalCollected, '', ''],
      [],
      ['Meal rate', summary.mealRate],
      ['Total bazar', summary.totalBazar],
      ['Meal-based expenses', summary.mealExpenses],
      ['Other (equal) expenses', summary.otherExpenses],
      ['Total cost', summary.totalCost],
      ['Total collected', summary.totalCollected],
    ]
    download(`mess-report-${month}.csv`, toCSV(rows))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly Report" subtitle={monthLabel(month)} icon={<FileBarChart className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
        <Menu
          trigger={({ toggle }) => (
            <Button size="sm" variant="secondary" onClick={toggle} icon={<Download className="w-4 h-4" />} className="print:hidden">Export</Button>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon={<Download className="w-4 h-4" />} onClick={() => { exportCSV(); close() }}>Download CSV</MenuItem>
              <MenuItem icon={<Printer className="w-4 h-4" />} onClick={() => { close(); printMonthReport({ messName: mess?.name ?? 'Mess', messCode: mess?.code, month, summary }) }}>Print / Save PDF</MenuItem>
            </>
          )}
        </Menu>
      </PageHeader>

      {/* Print header (only visible when printing) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">{mess?.name}</h1>
        <p className="text-sm text-gray-600">Monthly report · {monthLabel(month)}</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Meals" value={summary.totalMeals} sub={`${summary.guestMeals} guest`} icon={<UtensilsCrossed className="w-5 h-5" />} tone="brand" />
        <Stat label="Meal Rate" value={taka(summary.mealRate, { decimals: 2 })} icon={<Coins className="w-5 h-5" />} tone="violet" />
        <Stat label="Total Cost" value={taka(summary.totalCost)} icon={<Receipt className="w-5 h-5" />} tone="amber" />
        <Stat label="Collected" value={taka(summary.totalCollected)} icon={<TrendingUp className="w-5 h-5" />} tone="green" />
      </div>

      {/* Cost breakdown */}
      <Card className="p-5">
        <h2 className="font-display font-bold text-ink-900 mb-4">Cost breakdown</h2>
        <div className="space-y-3">
          <BreakdownRow icon={<ShoppingCart className="w-4 h-4" />} label="Bazar (groceries)" value={summary.totalBazar} tone="from-emerald-500 to-teal-500" total={summary.totalCost} />
          <BreakdownRow icon={<UtensilsCrossed className="w-4 h-4" />} label="Meal-based expenses" value={summary.mealExpenses} tone="from-brand-500 to-violet-500" total={summary.totalCost} />
          <BreakdownRow icon={<Receipt className="w-4 h-4" />} label="Other (equally split)" value={summary.otherExpenses} tone="from-amber-400 to-orange-500" total={summary.totalCost} />
          <div className="flex items-center justify-between pt-3 border-t border-line/[0.10]">
            <span className="font-semibold text-ink-700">Total cost</span>
            <span className="font-display font-extrabold text-xl text-ink-900">{taka(summary.totalCost)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-500">Meal basis ÷ {summary.totalMeals} meals</span>
            <span className="font-semibold text-ink-700">= {taka(summary.mealRate, { decimals: 2 })} / meal</span>
          </div>
        </div>
      </Card>

      {/* Member table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-3"><h2 className="font-display font-bold text-ink-900">Member breakdown</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-y border-line/[0.10]">
                <th className="font-semibold px-5 py-2.5">Member</th>
                <th className="font-semibold px-3 py-2.5 text-center">Meals</th>
                <th className="font-semibold px-3 py-2.5 text-right">Meal cost</th>
                <th className="font-semibold px-3 py-2.5 text-right">Other</th>
                <th className="font-semibold px-3 py-2.5 text-right">Total</th>
                <th className="font-semibold px-3 py-2.5 text-right">Paid</th>
                <th className="font-semibold px-5 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {summary.members.map((m) => (
                <tr key={m.memberId} className="border-b border-line/[0.10]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.member.name} color={m.member.avatarColor} size="xs" />
                      <span className="font-semibold text-ink-800">{m.member.name}</span>
                      {!m.member.active && <Badge tone="slate">left</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-ink-700">{m.meals}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink-700">{taka(m.mealCost)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink-700">{taka(m.otherCost)}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold text-ink-900">{taka(m.totalCost)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{taka(m.paid)}</td>
                  <td className={cn('px-5 py-3 text-right tabular-nums font-bold', m.status === 'due' ? 'text-rose-700 dark:text-rose-400' : m.status === 'receivable' ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-400')}>
                    {taka(m.balance, { sign: true })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line/[0.10] font-bold text-ink-900">
                <td className="px-5 py-3">Total</td>
                <td className="px-3 py-3 text-center tabular-nums">{summary.totalMeals}</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right tabular-nums">{taka(summary.totalCost)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{taka(summary.totalCollected)}</td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Bazar by category */}
      <Card className="p-5">
        <h2 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Bazar by category</h2>
        {catTotals.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="w-7 h-7" />} title="No bazar this month" />
        ) : (
          <div className="space-y-2.5">
            {catTotals.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-ink-600 shrink-0">{cat}</span>
                <div className="flex-1 h-2.5 rounded-full bg-ink-200/60 overflow-hidden">
                  <div className="h-full rounded-full grad-brand" style={{ width: `${(amt / (catTotals[0][1] || 1)) * 100}%` }} />
                </div>
                <span className="text-sm font-semibold text-ink-800 tabular-nums w-20 text-right">{taka(amt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function BreakdownRow({ icon, label, value, tone, total }: { icon: React.ReactNode; label: string; value: number; tone: string; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <span className={cn('w-7 h-7 rounded-lg grid place-items-center text-white bg-gradient-to-br', tone)}>{icon}</span>
          {label}
        </span>
        <span className="font-semibold text-ink-800 tabular-nums">{taka(value)} <span className="text-ink-400 text-xs">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-ink-200/60 overflow-hidden ml-9">
        <div className={cn('h-full rounded-full bg-gradient-to-r', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
