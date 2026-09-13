import { useEffect, useMemo, useState } from 'react'
import { Wallet, Plus, Search, Trash2, Pencil, PiggyBank, Coins } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { useMonthState, useMonthSummary } from '@/hooks/useMonth'
import { Card, Stat, Avatar, Button, Badge, Chip, EmptyState, Modal, Field, Input, Select } from '@/components/ui'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { useActiveMembers, useCan } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { taka } from '@/lib/format'
import { shortDate, monthLabel } from '@/lib/date'
import { PAYMENT_METHODS } from '@/lib/permissions'
import type { PaymentMethod } from '@/lib/types'

export function Payments() {
  const { month, prev, next, isCurrent } = useMonthState()
  const summary = useMonthSummary(month)
  const can = useCan()
  const canManage = can('manageSettlements')
  const paymentsAll = useStore((s) => s.db.payments)
  const membersAll = useStore((s) => s.db.members)
  const messId = useStore((s) => s.currentMessId)
  const deletePayment = useStore((s) => s.deletePayment)
  const openQuick = useUI((s) => s.openQuick)
  const confirm = useUI((s) => s.confirm)

  const [query, setQuery] = useState('')
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [editId, setEditId] = useState<string | null>(null)

  const nameOf = (id: string) => membersAll.find((m) => m.id === id)?.name ?? '—'
  const colorOf = (id: string) => membersAll.find((m) => m.id === id)?.avatarColor

  const monthPayments = useMemo(
    () => paymentsAll.filter((p) => p.messId === messId && p.date.slice(0, 7) === month),
    [paymentsAll, messId, month],
  )
  const entries = useMemo(() => {
    return monthPayments
      .filter((p) => (method === 'all' ? true : p.method === method))
      .filter((p) => (!query.trim() ? true : nameOf(p.memberId).toLowerCase().includes(query.toLowerCase()) || (p.note ?? '').toLowerCase().includes(query.toLowerCase())))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [monthPayments, method, query])

  const total = monthPayments.reduce((s, p) => s + p.amount, 0)
  const fundLeft = total - (summary?.totalCost ?? 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle={monthLabel(month)} icon={<Wallet className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
        <Button size="sm" onClick={() => openQuick('payment')} icon={<Plus className="w-4 h-4" />} className="hidden sm:inline-flex">Add payment</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Collected" value={taka(total)} icon={<PiggyBank className="w-5 h-5" />} tone="green" />
        <Stat label="Total cost" value={taka(summary?.totalCost ?? 0)} icon={<Wallet className="w-5 h-5" />} tone="brand" />
        <Stat label="Money in Fund" value={taka(fundLeft)} sub={fundLeft >= 0 ? 'in hand' : 'short of cost'} icon={<Coins className="w-5 h-5" />} tone={fundLeft >= 0 ? 'green' : 'rose'} />
        <Stat label="Payments" value={monthPayments.length} icon={<Wallet className="w-5 h-5" />} tone="sky" />
      </div>

      <div className="space-y-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by member or note…" leading={<Search className="w-4 h-4" />} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
          <Chip active={method === 'all'} onClick={() => setMethod('all')}>All methods</Chip>
          {PAYMENT_METHODS.map((m) => (
            <Chip key={m} active={method === m} onClick={() => setMethod(m)}>{m}</Chip>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={<Wallet className="w-7 h-7" />}
            title="No payments yet"
            message="Record member deposits to track who has paid."
            action={<Button onClick={() => openQuick('payment')} icon={<Plus className="w-4 h-4" />}>Add payment</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {entries.map((p) => (
            <Card key={p.id} hover className="p-4 flex items-center gap-3">
              <Avatar name={nameOf(p.memberId)} color={colorOf(p.memberId)} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-800 truncate">{nameOf(p.memberId)}</p>
                <p className="text-xs text-ink-500 truncate">{shortDate(p.date)}{p.note ? ` · ${p.note}` : ''}</p>
              </div>
              <Badge tone="green">{p.method}</Badge>
              <span className="font-display font-extrabold text-emerald-400 text-lg">{taka(p.amount)}</span>
              {canManage && (
                <Menu
                  trigger={({ toggle }) => (
                    <button onClick={toggle} className="w-8 h-8 grid place-items-center rounded-xl text-ink-400 hover:bg-white/[0.09] transition">⋯</button>
                  )}
                >
                  {(close) => (
                    <>
                      <MenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => { setEditId(p.id); close() }}>Edit</MenuItem>
                      <MenuItem
                        icon={<Trash2 className="w-4 h-4" />}
                        danger
                        onClick={async () => {
                          close()
                          if (await confirm({ title: 'Delete payment?', message: `${nameOf(p.memberId)}'s ${taka(p.amount)} payment will be removed.`, danger: true, confirmText: 'Delete' }))
                            deletePayment(p.id)
                        }}
                      >
                        Delete
                      </MenuItem>
                    </>
                  )}
                </Menu>
              )}
            </Card>
          ))}
        </div>
      )}

      <PaymentEditModal editId={editId} onClose={() => setEditId(null)} />
    </div>
  )
}

function PaymentEditModal({ editId, onClose }: { editId: string | null; onClose: () => void }) {
  const payment = useStore((s) => (editId ? s.db.payments.find((p) => p.id === editId) ?? null : null))
  const members = useActiveMembers()
  const updatePayment = useStore((s) => s.updatePayment)
  const toast = useUI((s) => s.toast)

  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('bKash')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!payment) return
    setMemberId(payment.memberId)
    setAmount(payment.amount.toString())
    setDate(payment.date)
    setMethod(payment.method)
    setNote(payment.note ?? '')
  }, [payment])

  const save = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Enter a valid amount', 'error')
    updatePayment(editId!, { memberId, amount: amt, date, method, note: note.trim() || undefined })
    toast('Payment updated')
    onClose()
  }

  return (
    <Modal
      open={!!editId}
      onClose={onClose}
      title="Edit payment"
      icon={<Wallet className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Member"><Select value={memberId} onChange={(e) => setMemberId(e.target.value)} options={members.map((m) => ({ value: m.id, label: m.name }))} /></Field>
          <Field label="Amount"><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} leading={<span className="text-ink-500">৳</span>} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} /></Field>
        </div>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
