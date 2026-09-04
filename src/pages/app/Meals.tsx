import { useEffect, useMemo, useState } from 'react'
import { UtensilsCrossed, Users2, Trash2, Plus, Coins, Sun, Sunset, Moon } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Stat, Avatar, Button, Modal, Stepper, Badge, EmptyState, Chip } from '@/components/ui'
import { useMonthState, useMonthSummary } from '@/hooks/useMonth'
import { useCurrentMember, useActiveMembers, useCan } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { taka } from '@/lib/format'
import { eachDay, firstWeekday, DAY_SHORT, shortDate, longDate, monthLabel, todayISO } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { ID } from '@/lib/types'

export function Meals() {
  const me = useCurrentMember()
  const can = useCan()
  const members = useActiveMembers()
  const { month, prev, next, isCurrent } = useMonthState()
  const summary = useMonthSummary(month)
  const setMeal = useStore((s) => s.setMeal)
  const deleteGuestMeal = useStore((s) => s.deleteGuestMeal)
  const mealsAll = useStore((s) => s.db.meals)
  const guestsAll = useStore((s) => s.db.guestMeals)
  const messId = useStore((s) => s.currentMessId)
  const openQuick = useUI((s) => s.openQuick)
  const confirm = useUI((s) => s.confirm)

  const canAll = can('manageMeals')
  const selectable = canAll ? members : members.filter((m) => m.id === me?.id)
  const [selId, setSelId] = useState<ID>(me?.id ?? selectable[0]?.id ?? '')
  const [editDate, setEditDate] = useState<string | null>(null)

  const memberMeals = useMemo(() => {
    const map: Record<string, { b: number; l: number; d: number }> = {}
    mealsAll
      .filter((m) => m.messId === messId && m.memberId === selId && m.date.slice(0, 7) === month)
      .forEach((m) => (map[m.date] = { b: m.breakfast, l: m.lunch, d: m.dinner }))
    return map
  }, [mealsAll, messId, selId, month])

  const guests = useMemo(
    () => guestsAll.filter((g) => g.messId === messId && g.date.slice(0, 7) === month).sort((a, b) => b.date.localeCompare(a.date)),
    [guestsAll, messId, month],
  )

  if (!summary) return null

  const days = eachDay(month)
  const blanks = firstWeekday(month)
  const today = todayISO()
  const selMember = members.find((m) => m.id === selId)
  const memberById = (id: ID) => members.find((m) => m.id === id)

  return (
    <div className="space-y-6">
      <PageHeader title="Meals" subtitle={monthLabel(month)} icon={<UtensilsCrossed className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Meals" value={summary.totalMeals} icon={<UtensilsCrossed className="w-5 h-5" />} tone="brand" />
        <Stat label="Breakfast" value={summary.breakfast} icon={<Sun className="w-5 h-5" />} tone="amber" />
        <Stat label="Lunch" value={summary.lunch} icon={<Sunset className="w-5 h-5" />} tone="sky" />
        <Stat label="Dinner / Meal Rate" value={summary.dinner} sub={`Rate ${taka(summary.mealRate, { decimals: 2 })}`} icon={<Moon className="w-5 h-5" />} tone="violet" />
      </div>

      {/* Member selector + calendar */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
            {selectable.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelId(m.id)}
                className={cn(
                  'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition shrink-0',
                  m.id === selId ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white border-transparent shadow-glow' : 'bg-white/[0.06] border-white/[0.10] text-ink-600 hover:bg-white/[0.10]',
                )}
              >
                <Avatar name={m.name} color={m.avatarColor} size="xs" />
                <span className="text-sm font-semibold whitespace-nowrap">{m.id === me?.id ? 'You' : m.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <Button size="sm" variant="subtle" icon={<Plus className="w-4 h-4" />} onClick={() => openQuick('guest')}>Guest meal</Button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {DAY_SHORT.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-ink-400 pb-1">{d}</div>
          ))}
          {Array.from({ length: blanks }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((date) => {
            const mm = memberMeals[date]
            const total = mm ? mm.b + mm.l + mm.d : 0
            const isToday = date === today
            const isFuture = date > today
            return (
              <button
                key={date}
                onClick={() => setEditDate(date)}
                className={cn(
                  'aspect-square rounded-2xl border flex flex-col items-center justify-center transition relative',
                  total > 0 ? 'bg-gradient-to-br from-brand-500/15 to-violet-500/10 border-brand-300/60' : 'bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.09]',
                  isToday && 'ring-2 ring-brand-500/60',
                  isFuture && 'opacity-70',
                )}
              >
                <span className={cn('text-xs font-semibold', total > 0 ? 'text-brand-300' : 'text-ink-500')}>{parseInt(date.slice(-2))}</span>
                {total > 0 && <span className="font-display font-extrabold text-ink-900 text-sm leading-none mt-0.5">{total}</span>}
                {mm && (
                  <span className="flex gap-0.5 mt-1">
                    {mm.b > 0 && <Dot />}
                    {mm.l > 0 && <Dot />}
                    {mm.d > 0 && <Dot />}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-ink-400 mt-3">Tap any day to set {selMember?.id === me?.id ? 'your' : `${selMember?.name?.split(' ')[0]}’s`} breakfast, lunch and dinner.</p>
      </Card>

      {/* Monthly per-member table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-3 flex items-center gap-2">
          <Users2 className="w-4 h-4 text-brand-400" />
          <h2 className="font-display font-bold text-ink-900">Monthly meals by member</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-y border-white/[0.10]">
                <th className="font-semibold px-5 py-2.5">Member</th>
                <th className="font-semibold px-3 py-2.5 text-center">B</th>
                <th className="font-semibold px-3 py-2.5 text-center">L</th>
                <th className="font-semibold px-3 py-2.5 text-center">D</th>
                <th className="font-semibold px-3 py-2.5 text-center">Guest</th>
                <th className="font-semibold px-3 py-2.5 text-center">Total</th>
                <th className="font-semibold px-5 py-2.5 text-right">Meal cost</th>
              </tr>
            </thead>
            <tbody>
              {summary.members.map((m) => (
                <tr key={m.memberId} className="border-b border-white/[0.10] hover:bg-white/[0.05] transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.member.name} color={m.member.avatarColor} size="xs" />
                      <span className="font-semibold text-ink-800">{m.member.name}</span>
                      {!m.member.active && <Badge tone="slate">left</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-ink-600">{m.breakfast}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-ink-600">{m.lunch}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-ink-600">{m.dinner}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-ink-600">{m.guestMeals || '—'}</td>
                  <td className="px-3 py-3 text-center font-bold text-ink-900 tabular-nums">{m.meals}</td>
                  <td className="px-5 py-3 text-right font-semibold text-ink-800 tabular-nums">{taka(m.mealCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Guest meals */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-ink-900 flex items-center gap-2"><Users2 className="w-4 h-4 text-brand-400" /> Guest meals</h2>
          <Button size="sm" variant="subtle" icon={<Plus className="w-4 h-4" />} onClick={() => openQuick('guest')}>Add</Button>
        </div>
        {guests.length === 0 ? (
          <EmptyState icon={<Users2 className="w-7 h-7" />} title="No guest meals" message="Guest meals are charged to the host member and included in totals." />
        ) : (
          <div className="space-y-2">
            {guests.map((g) => (
              <div key={g.id} className="flex items-center gap-3 glass-panel rounded-2xl px-3 py-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 grid place-items-center text-white text-xs font-bold shrink-0">
                  {g.count}×
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-800 text-sm truncate">{g.guestName} <span className="text-ink-400 font-normal">· {g.type}</span></p>
                  <p className="text-xs text-ink-500">Host: {memberById(g.hostMemberId)?.name ?? '—'} · {shortDate(g.date)}</p>
                </div>
                <button
                  onClick={async () => {
                    if (await confirm({ title: 'Delete guest meal?', message: `${g.guestName}'s ${g.count} ${g.type} meal(s) will be removed.`, danger: true, confirmText: 'Delete' }))
                      deleteGuestMeal(g.id)
                  }}
                  className="w-9 h-9 grid place-items-center rounded-xl text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <DayEditor
        date={editDate}
        memberName={selMember?.id === me?.id ? 'You' : selMember?.name ?? ''}
        initial={editDate ? memberMeals[editDate] : undefined}
        onClose={() => setEditDate(null)}
        onSave={(b, l, d) => {
          if (editDate) setMeal({ memberId: selId, date: editDate, breakfast: b, lunch: l, dinner: d })
          setEditDate(null)
        }}
      />
    </div>
  )
}

function Dot() {
  return <span className="w-1 h-1 rounded-full bg-brand-500" />
}

function DayEditor({
  date, memberName, initial, onClose, onSave,
}: {
  date: string | null
  memberName: string
  initial?: { b: number; l: number; d: number }
  onClose: () => void
  onSave: (b: number, l: number, d: number) => void
}) {
  const [b, setB] = useState(0)
  const [l, setL] = useState(0)
  const [d, setD] = useState(0)

  // reset steppers whenever a different day is opened
  useEffect(() => {
    setB(initial?.b ?? 0)
    setL(initial?.l ?? 0)
    setD(initial?.d ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const total = b + l + d
  const rows = [
    { label: 'Breakfast', icon: <Sun className="w-4 h-4 text-amber-500" />, v: b, set: setB },
    { label: 'Lunch', icon: <Sunset className="w-4 h-4 text-sky-500" />, v: l, set: setL },
    { label: 'Dinner', icon: <Moon className="w-4 h-4 text-violet-500" />, v: d, set: setD },
  ]

  return (
    <Modal
      open={!!date}
      onClose={onClose}
      title={date ? longDate(date) : ''}
      description={`${memberName} · ${total} meal${total === 1 ? '' : 's'}`}
      icon={<UtensilsCrossed className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(b, l, d)} icon={<Coins className="w-4 h-4" />}>Save · {total}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between glass-panel rounded-2xl px-4 py-3">
            <span className="font-semibold text-ink-700 flex items-center gap-2">{r.icon}{r.label}</span>
            <Stepper value={r.v} onChange={r.set} max={20} />
          </div>
        ))}
      </div>
    </Modal>
  )
}
