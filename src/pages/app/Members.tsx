import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, Shield, ShieldOff, Crown, UserMinus, ChevronRight, Copy } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, Avatar, Button, Badge, ProgressBar } from '@/components/ui'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { useMembers, useCurrentMember, useCan, useMess } from '@/hooks/useMess'
import { useMonthSummary } from '@/hooks/useMonth'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { taka } from '@/lib/format'
import { currentMonth } from '@/lib/date'
import { ROLE_LABEL, ROLE_BADGE } from '@/lib/permissions'
import { cn } from '@/lib/cn'

export function Members() {
  const navigate = useNavigate()
  const members = useMembers()
  const me = useCurrentMember()
  const mess = useMess()
  const can = useCan()
  const summary = useMonthSummary(currentMonth())
  const openQuick = useUI((s) => s.openQuick)
  const confirm = useUI((s) => s.confirm)
  const toast = useUI((s) => s.toast)
  const assignManager = useStore((s) => s.assignManager)
  const removeManager = useStore((s) => s.removeManager)
  const removeMember = useStore((s) => s.removeMember)
  const transferOwnership = useStore((s) => s.transferOwnership)

  const active = members.filter((m) => m.active)
  const left = members.filter((m) => !m.active)
  const balOf = (id: string) => summary?.members.find((mm) => mm.memberId === id)
  const full = mess ? active.length >= mess.maxMembers : false

  const canAssign = can('assignManager')
  const canRemove = can('removeMembers')
  const canTransfer = can('transferOwnership')

  return (
    <div className="space-y-6">
      <PageHeader title="Members" subtitle={`${active.length} of ${mess?.maxMembers ?? 0} members`} icon={<Users className="w-5 h-5" />}>
        {can('inviteMembers') && (
          <Button size="sm" onClick={() => openQuick('invite')} icon={<UserPlus className="w-4 h-4" />}>Invite</Button>
        )}
      </PageHeader>

      {/* capacity */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-ink-700">Capacity</p>
          <div className="flex items-center gap-2">
            {full && <Badge tone="amber">Full</Badge>}
            <span className="text-sm text-ink-500">{active.length} / {mess?.maxMembers}</span>
          </div>
        </div>
        <ProgressBar value={mess ? (active.length / mess.maxMembers) * 100 : 0} tone={full ? 'amber' : 'brand'} />
        <div className="flex items-center gap-2 mt-3 text-xs text-ink-500">
          <span>Mess code</span>
          <button
            onClick={() => { navigator.clipboard?.writeText(mess?.code ?? ''); toast('Code copied') }}
            className="inline-flex items-center gap-1.5 font-mono font-bold tracking-widest text-ink-800 bg-overlay/[0.08] rounded-lg px-2 py-1 hover:bg-overlay/[0.10] transition"
          >
            {mess?.code} <Copy className="w-3 h-3" />
          </button>
        </div>
      </Card>

      <div className="space-y-2.5">
        {active.map((m) => {
          const bal = balOf(m.id)
          const isSelf = m.id === me?.id
          const showMenu = !isSelf && m.role !== 'owner' && (canAssign || canRemove || canTransfer)
          return (
            <Card key={m.id} hover className="p-4">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(`/app/members/${m.id}`)} className="shrink-0">
                  <Avatar name={m.name} color={m.avatarColor} size="md" ring />
                </button>
                <button onClick={() => navigate(`/app/members/${m.id}`)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink-900 truncate">{m.name}{isSelf && <span className="text-ink-400 font-normal"> (You)</span>}</p>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-br', ROLE_BADGE[m.role])}>
                      {m.role === 'owner' && <Crown className="w-3 h-3" />}
                      {m.role === 'manager' && <Shield className="w-3 h-3" />}
                      {ROLE_LABEL[m.role]}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 truncate">{m.contact ?? 'No contact'} · {bal?.meals ?? 0} meals</p>
                </button>
                <div className="text-right shrink-0">
                  <p className={cn('font-bold tabular-nums', bal?.status === 'due' ? 'text-rose-700 dark:text-rose-400' : bal?.status === 'receivable' ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-400')}>
                    {bal && bal.status !== 'settled' ? taka(Math.abs(bal.balance)) : '—'}
                  </p>
                  <p className="text-[11px] text-ink-400">{bal?.status === 'due' ? 'owes' : bal?.status === 'receivable' ? 'receivable' : 'settled'}</p>
                </div>
                {showMenu ? (
                  <Menu
                    trigger={({ toggle }) => (
                      <button onClick={toggle} className="w-8 h-8 grid place-items-center rounded-xl text-ink-400 hover:bg-overlay/[0.09] transition shrink-0">⋯</button>
                    )}
                  >
                    {(close) => (
                      <>
                        {canAssign && m.role === 'member' && (
                          <MenuItem icon={<Shield className="w-4 h-4" />} onClick={() => { assignManager(m.id); toast(`${m.name} is now Main Manager`); close() }}>Make Main Manager</MenuItem>
                        )}
                        {canAssign && m.role === 'manager' && (
                          <MenuItem icon={<ShieldOff className="w-4 h-4" />} onClick={() => { removeManager(m.id); toast('Manager role removed'); close() }}>Remove manager role</MenuItem>
                        )}
                        {canTransfer && (
                          <MenuItem
                            icon={<Crown className="w-4 h-4" />}
                            onClick={async () => {
                              close()
                              if (await confirm({ title: `Transfer ownership to ${m.name}?`, message: 'You will become a normal member. This cannot be undone by you.', confirmText: 'Transfer', danger: true })) {
                                const r = transferOwnership(m.id)
                                toast(r.ok ? 'Ownership transferred' : r.error!, r.ok ? 'success' : 'error')
                              }
                            }}
                          >
                            Transfer ownership
                          </MenuItem>
                        )}
                        {canRemove && (
                          <MenuItem
                            icon={<UserMinus className="w-4 h-4" />}
                            danger
                            onClick={async () => {
                              close()
                              if (await confirm({ title: `Remove ${m.name}?`, message: 'Their meal and payment records stay in mess history. They can rejoin with the code.', confirmText: 'Remove', danger: true })) {
                                const r = removeMember(m.id)
                                toast(r.ok ? `${m.name} removed` : r.error!, r.ok ? 'success' : 'error')
                              }
                            }}
                          >
                            Remove from mess
                          </MenuItem>
                        )}
                      </>
                    )}
                  </Menu>
                ) : (
                  <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" onClick={() => navigate(`/app/members/${m.id}`)} />
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {left.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2 mt-4">Left the mess</p>
          <div className="space-y-2">
            {left.map((m) => (
              <button key={m.id} onClick={() => navigate(`/app/members/${m.id}`)} className="w-full glass-panel rounded-2xl p-3 flex items-center gap-3 opacity-75 hover:opacity-100 transition text-left">
                <Avatar name={m.name} color={m.avatarColor} size="sm" />
                <span className="flex-1 font-semibold text-ink-700 truncate">{m.name}</span>
                <Badge tone="slate">left</Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
