import { useMemo } from 'react'
import { Bell, CheckCheck, Trash2, UtensilsCrossed, CalendarClock, Wallet, ArrowLeftRight, Users2, ShoppingCart, Palmtree, Info } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, Button, EmptyState } from '@/components/ui'
import { useCurrentMember } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { relativeTime } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { Notification } from '@/lib/types'

const KIND_ICON: Record<Notification['kind'], { icon: React.ReactNode; tone: string }> = {
  meal: { icon: <UtensilsCrossed className="w-4 h-4" />, tone: 'from-brand-500 to-violet-500' },
  booking: { icon: <CalendarClock className="w-4 h-4" />, tone: 'from-sky-500 to-cyan-500' },
  due: { icon: <Wallet className="w-4 h-4" />, tone: 'from-rose-500 to-red-500' },
  settlement: { icon: <ArrowLeftRight className="w-4 h-4" />, tone: 'from-emerald-500 to-teal-500' },
  member: { icon: <Users2 className="w-4 h-4" />, tone: 'from-violet-500 to-fuchsia-500' },
  bazar: { icon: <ShoppingCart className="w-4 h-4" />, tone: 'from-emerald-500 to-teal-500' },
  leave: { icon: <Palmtree className="w-4 h-4" />, tone: 'from-amber-400 to-orange-500' },
  info: { icon: <Info className="w-4 h-4" />, tone: 'from-slate-400 to-slate-500' },
}

export function Notifications() {
  const me = useCurrentMember()
  const messId = useStore((s) => s.currentMessId)
  const notifsAll = useStore((s) => s.db.notifications)
  const markNotifRead = useStore((s) => s.markNotifRead)
  const markAllNotifsRead = useStore((s) => s.markAllNotifsRead)
  const clearNotifs = useStore((s) => s.clearNotifs)
  const confirm = useUI((s) => s.confirm)

  const notifs = useMemo(
    () => notifsAll
      .filter((n) => n.messId === messId && (n.memberId == null || n.memberId === me?.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifsAll, messId, me?.id],
  )
  const unread = notifs.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} icon={<Bell className="w-5 h-5" />}>
        {notifs.length > 0 && (
          <div className="flex gap-2">
            {unread > 0 && <Button size="sm" variant="secondary" onClick={markAllNotifsRead} icon={<CheckCheck className="w-4 h-4" />}>Mark all read</Button>}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => { if (await confirm({ title: 'Clear notifications?', message: 'All notifications for this mess will be removed.', danger: true, confirmText: 'Clear' })) clearNotifs() }}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Clear
            </Button>
          </div>
        )}
      </PageHeader>

      {notifs.length === 0 ? (
        <Card className="py-4"><EmptyState icon={<Bell className="w-7 h-7" />} title="No notifications" message="Meal reminders, payments and mess updates will show up here." /></Card>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const k = KIND_ICON[n.kind] ?? KIND_ICON.info
            return (
              <button
                key={n.id}
                onClick={() => !n.read && markNotifRead(n.id)}
                className={cn('w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition border', n.read ? 'bg-overlay/[0.05] border-line/[0.10]' : 'glass-strong border-brand-200/60')}
              >
                <div className={cn('w-10 h-10 rounded-2xl grid place-items-center text-white shrink-0 bg-gradient-to-br', k.tone)}>{k.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', n.read ? 'text-ink-600' : 'font-semibold text-ink-900')}>{n.text}</p>
                  <p className="text-xs text-ink-400">{relativeTime(n.createdAt)}</p>
                </div>
                {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
