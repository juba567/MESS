import { useMemo } from 'react'
import { History, Sparkles, UserPlus, ShoppingCart, Receipt, Wallet, Shield, Crown, UserMinus, LogOut, Settings, SlidersHorizontal, Palmtree, CheckCircle2, Users2, Activity as ActivityIcon } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, Avatar, EmptyState } from '@/components/ui'
import { useMembers } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { relativeTime, longDate } from '@/lib/date'

const ICONS: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="w-3.5 h-3.5" />,
  'user-plus': <UserPlus className="w-3.5 h-3.5" />,
  'shopping-cart': <ShoppingCart className="w-3.5 h-3.5" />,
  receipt: <Receipt className="w-3.5 h-3.5" />,
  wallet: <Wallet className="w-3.5 h-3.5" />,
  shield: <Shield className="w-3.5 h-3.5" />,
  crown: <Crown className="w-3.5 h-3.5" />,
  'user-minus': <UserMinus className="w-3.5 h-3.5" />,
  'log-out': <LogOut className="w-3.5 h-3.5" />,
  settings: <Settings className="w-3.5 h-3.5" />,
  sliders: <SlidersHorizontal className="w-3.5 h-3.5" />,
  palmtree: <Palmtree className="w-3.5 h-3.5" />,
  'check-circle': <CheckCircle2 className="w-3.5 h-3.5" />,
  users: <Users2 className="w-3.5 h-3.5" />,
}

export function Activity() {
  const members = useMembers()
  const messId = useStore((s) => s.currentMessId)
  const activitiesAll = useStore((s) => s.db.activities)

  const groups = useMemo(() => {
    const list = activitiesAll.filter((a) => a.messId === messId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const byDay: Record<string, typeof list> = {}
    for (const a of list) {
      const day = a.createdAt.slice(0, 10)
      ;(byDay[day] ??= []).push(a)
    }
    return Object.entries(byDay)
  }, [activitiesAll, messId])

  const avatarOf = (id?: string) => members.find((m) => m.id === id)

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" subtitle="Everything that happens in the mess" icon={<History className="w-5 h-5" />} />

      {groups.length === 0 ? (
        <Card className="py-4"><EmptyState icon={<ActivityIcon className="w-7 h-7" />} title="No activity yet" message="Meals, bazar, payments and member changes will appear here as a timeline." /></Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-3">{longDate(day)}</p>
              <Card className="p-2">
                <div className="relative pl-2">
                  {items.map((a, i) => {
                    const actor = avatarOf(a.actorMemberId)
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/[0.05] transition">
                        <div className="relative shrink-0">
                          {actor ? <Avatar name={actor.name} color={actor.avatarColor} size="sm" /> : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 grid place-items-center text-white"><Sparkles className="w-4 h-4" /></div>}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white grid place-items-center text-brand-400 shadow-glass-sm">{ICONS[a.icon] ?? <ActivityIcon className="w-3 h-3" />}</span>
                          {i < items.length - 1 && <span className="absolute left-1/2 top-11 -translate-x-1/2 w-px h-[calc(100%-1rem)] bg-white/[0.08]" />}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-ink-700 leading-snug"><span className="font-semibold text-ink-900">{a.actorName}</span> {a.text}</p>
                          <p className="text-xs text-ink-400 mt-0.5">{relativeTime(a.createdAt)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
