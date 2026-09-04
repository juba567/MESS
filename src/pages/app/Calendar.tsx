import { useMemo, useState } from 'react'
import { CalendarDays, UtensilsCrossed, ShoppingCart, Receipt, Palmtree, Users2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Avatar, Modal, EmptyState, Badge } from '@/components/ui'
import { useMonthState } from '@/hooks/useMonth'
import { useMembers } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { bazarTotal } from '@/lib/calc'
import { taka } from '@/lib/format'
import { eachDay, firstWeekday, DAY_SHORT, longDate, monthLabel, todayISO, betweenInclusive } from '@/lib/date'
import { cn } from '@/lib/cn'

export function Calendar() {
  const { month, prev, next, isCurrent } = useMonthState()
  const members = useMembers()
  const messId = useStore((s) => s.currentMessId)
  const mealsAll = useStore((s) => s.db.meals)
  const guestsAll = useStore((s) => s.db.guestMeals)
  const bazarsAll = useStore((s) => s.db.bazars)
  const expensesAll = useStore((s) => s.db.expenses)
  const [openDate, setOpenDate] = useState<string | null>(null)

  const byDay = useMemo(() => {
    const map: Record<string, { meals: number; bazar: number; expense: number }> = {}
    const bump = (d: string) => (map[d] ??= { meals: 0, bazar: 0, expense: 0 })
    mealsAll.filter((m) => m.messId === messId && m.date.slice(0, 7) === month).forEach((m) => { bump(m.date).meals += m.breakfast + m.lunch + m.dinner })
    guestsAll.filter((g) => g.messId === messId && g.date.slice(0, 7) === month).forEach((g) => { bump(g.date).meals += g.count })
    bazarsAll.filter((b) => b.messId === messId && b.date.slice(0, 7) === month).forEach((b) => { bump(b.date).bazar += bazarTotal(b) })
    expensesAll.filter((e) => e.messId === messId && e.date.slice(0, 7) === month).forEach((e) => { bump(e.date).expense += e.amount })
    return map
  }, [mealsAll, guestsAll, bazarsAll, expensesAll, messId, month])

  const days = eachDay(month)
  const blanks = firstWeekday(month)
  const today = todayISO()

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" subtitle={monthLabel(month)} icon={<CalendarDays className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
      </PageHeader>

      <div className="flex items-center gap-4 text-xs text-ink-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Meals</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Bazar</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Expense</span>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {DAY_SHORT.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-ink-400 pb-1">{d}</div>
          ))}
          {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((date) => {
            const d = byDay[date]
            const isToday = date === today
            const isFuture = date > today
            return (
              <button
                key={date}
                onClick={() => setOpenDate(date)}
                className={cn(
                  'aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 transition relative p-1',
                  d?.meals ? 'bg-gradient-to-br from-brand-500/12 to-violet-500/8 border-brand-300/50' : 'bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.09]',
                  isToday && 'ring-2 ring-brand-500/60',
                  isFuture && 'opacity-60',
                )}
              >
                <span className={cn('text-[11px] font-semibold', isToday ? 'text-brand-300' : 'text-ink-500')}>{parseInt(date.slice(-2))}</span>
                {d?.meals ? <span className="font-display font-extrabold text-ink-900 text-sm leading-none">{d.meals}</span> : null}
                <span className="flex gap-0.5 h-1.5">
                  {d?.meals ? <span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> : null}
                  {d?.bazar ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : null}
                  {d?.expense ? <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <DayDetail date={openDate} onClose={() => setOpenDate(null)} members={members} />
    </div>
  )
}

function DayDetail({ date, onClose, members }: { date: string | null; onClose: () => void; members: ReturnType<typeof useMembers> }) {
  const messId = useStore((s) => s.currentMessId)
  const mealsAll = useStore((s) => s.db.meals)
  const guestsAll = useStore((s) => s.db.guestMeals)
  const bazarsAll = useStore((s) => s.db.bazars)
  const expensesAll = useStore((s) => s.db.expenses)
  const leavesAll = useStore((s) => s.db.leaves)

  const nameOf = (id: string) => members.find((m) => m.id === id)

  const data = useMemo(() => {
    if (!date) return null
    const meals = mealsAll.filter((m) => m.messId === messId && m.date === date && m.breakfast + m.lunch + m.dinner > 0)
    const guests = guestsAll.filter((g) => g.messId === messId && g.date === date)
    const bazars = bazarsAll.filter((b) => b.messId === messId && b.date === date)
    const expenses = expensesAll.filter((e) => e.messId === messId && e.date === date)
    const onLeave = leavesAll.filter((l) => l.messId === messId && betweenInclusive(date, l.startDate, l.endDate))
    return { meals, guests, bazars, expenses, onLeave }
  }, [date, mealsAll, guestsAll, bazarsAll, expensesAll, leavesAll, messId])

  const empty = data && !data.meals.length && !data.guests.length && !data.bazars.length && !data.expenses.length && !data.onLeave.length

  return (
    <Modal open={!!date} onClose={onClose} title={date ? longDate(date) : ''} icon={<CalendarDays className="w-5 h-5" />} size="lg">
      {empty ? (
        <EmptyState icon={<CalendarDays className="w-7 h-7" />} title="Nothing recorded" message="No meals, bazar or expenses on this day." />
      ) : (
        <div className="space-y-5 pb-2">
          {data && data.onLeave.length > 0 && (
            <Section icon={<Palmtree className="w-4 h-4" />} title="On leave">
              <div className="flex flex-wrap gap-2">
                {data.onLeave.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 rounded-full pl-1 pr-3 py-1 text-sm font-medium">
                    <Avatar name={nameOf(l.memberId)?.name ?? '—'} color={nameOf(l.memberId)?.avatarColor} size="xs" />
                    {nameOf(l.memberId)?.name}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {data && (data.meals.length > 0 || data.guests.length > 0) && (
            <Section icon={<UtensilsCrossed className="w-4 h-4" />} title="Meals">
              <div className="space-y-2">
                {data.meals.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2">
                    <Avatar name={nameOf(m.memberId)?.name ?? '—'} color={nameOf(m.memberId)?.avatarColor} size="xs" />
                    <span className="flex-1 font-semibold text-ink-800 text-sm">{nameOf(m.memberId)?.name}</span>
                    <span className="text-xs text-ink-500">B{m.breakfast} · L{m.lunch} · D{m.dinner}</span>
                    <Badge tone="brand">{m.breakfast + m.lunch + m.dinner}</Badge>
                  </div>
                ))}
                {data.guests.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 grid place-items-center text-white shrink-0"><Users2 className="w-3.5 h-3.5" /></div>
                    <span className="flex-1 font-semibold text-ink-800 text-sm">{g.guestName} <span className="font-normal text-ink-400">· {g.type}</span></span>
                    <span className="text-xs text-ink-500">host {nameOf(g.hostMemberId)?.name?.split(' ')[0]}</span>
                    <Badge tone="violet">{g.count}</Badge>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {data && data.bazars.length > 0 && (
            <Section icon={<ShoppingCart className="w-4 h-4" />} title="Bazar">
              <div className="space-y-2">
                {data.bazars.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2">
                    <Avatar name={nameOf(b.buyerMemberId)?.name ?? '—'} color={nameOf(b.buyerMemberId)?.avatarColor} size="xs" />
                    <span className="flex-1 font-semibold text-ink-800 text-sm truncate">{nameOf(b.buyerMemberId)?.name} · {b.items.length} items</span>
                    <span className="font-bold text-ink-900">{taka(bazarTotal(b))}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {data && data.expenses.length > 0 && (
            <Section icon={<Receipt className="w-4 h-4" />} title="Expenses">
              <div className="space-y-2">
                {data.expenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white shrink-0"><Receipt className="w-3.5 h-3.5" /></div>
                    <span className="flex-1 font-semibold text-ink-800 text-sm">{e.category}{e.description ? ` · ${e.description}` : ''}</span>
                    <span className="font-bold text-ink-900">{taka(e.amount)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Modal>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">{icon} {title}</p>
      {children}
    </div>
  )
}
