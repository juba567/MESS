import { useMemo } from 'react'
import { Palmtree, Plus, Trash2, CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, Avatar, Button, Badge, EmptyState } from '@/components/ui'
import { useMembers, useCurrentMember, useCan } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { shortDate, todayISO, betweenInclusive, parseISO } from '@/lib/date'

export function Leave() {
  const members = useMembers()
  const me = useCurrentMember()
  const can = useCan()
  const canOthers = can('manageLeaveOfOthers')
  const messId = useStore((s) => s.currentMessId)
  const leavesAll = useStore((s) => s.db.leaves)
  const deleteLeave = useStore((s) => s.deleteLeave)
  const openQuick = useUI((s) => s.openQuick)
  const confirm = useUI((s) => s.confirm)

  const nameOf = (id: string) => members.find((m) => m.id === id)
  const today = todayISO()

  const leaves = useMemo(
    () => leavesAll.filter((l) => l.messId === messId).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [leavesAll, messId],
  )
  const current = leaves.filter((l) => betweenInclusive(today, l.startDate, l.endDate))
  const upcoming = leaves.filter((l) => l.startDate > today)
  const past = leaves.filter((l) => l.endDate < today)

  const days = (s: string, e: string) => Math.round((parseISO(e).getTime() - parseISO(s).getTime()) / 86400000) + 1

  const canDelete = (memberId: string) => canOthers || memberId === me?.id

  const Row = ({ l, tone }: { l: (typeof leaves)[number]; tone?: 'amber' }) => {
    const m = nameOf(l.memberId)
    return (
      <Card hover className="p-4 flex items-center gap-3">
        <Avatar name={m?.name ?? '—'} color={m?.avatarColor} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink-800 truncate">{m?.name ?? '—'}{m?.id === me?.id && <span className="text-ink-400 font-normal"> (You)</span>}</p>
            {tone === 'amber' && <Badge tone="amber" dot>on leave</Badge>}
          </div>
          <p className="text-xs text-ink-500">{shortDate(l.startDate)} → {shortDate(l.endDate)} · {days(l.startDate, l.endDate)} day{days(l.startDate, l.endDate) === 1 ? '' : 's'}{l.reason ? ` · ${l.reason}` : ''}</p>
        </div>
        {canDelete(l.memberId) && (
          <button
            onClick={async () => {
              if (await confirm({ title: 'Delete leave?', message: `${m?.name}'s leave will be removed.`, danger: true, confirmText: 'Delete' }))
                deleteLeave(l.id)
            }}
            className="w-9 h-9 grid place-items-center rounded-xl text-rose-500 hover:bg-rose-500/10 transition shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leave & Vacation" subtitle="Track who's away and when" icon={<Palmtree className="w-5 h-5" />}>
        <Button size="sm" onClick={() => openQuick('leave')} icon={<Plus className="w-4 h-4" />}>Add leave</Button>
      </PageHeader>

      {leaves.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={<Palmtree className="w-7 h-7" />}
            title="No leave records"
            message="Add a leave so meal planning and cost sharing reflect who's away."
            action={<Button onClick={() => openQuick('leave')} icon={<Plus className="w-4 h-4" />}>Add leave</Button>}
          />
        </Card>
      ) : (
        <>
          {current.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Away right now</p>
              {current.map((l) => <Row key={l.id} l={l} tone="amber" />)}
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Upcoming</p>
              {upcoming.map((l) => <Row key={l.id} l={l} />)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Past</p>
              {past.map((l) => <Row key={l.id} l={l} />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
