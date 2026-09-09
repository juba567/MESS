import { useEffect, useMemo, useState } from 'react'
import { Copy, Check, Link2, QrCode, Trash2, Plus, UtensilsCrossed, ShoppingCart, Receipt, Wallet, Users2, Palmtree, Sunset, Moon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { useActiveMembers, useCurrentMember, useMess, useCan } from '@/hooks/useMess'
import { Modal, Button, Field, Input, Textarea, Select, Stepper, Segmented, Avatar } from '@/components/ui'
import { QRCode } from '@/components/QRCode'
import { todayISO, tomorrowISO } from '@/lib/date'
import { BAZAR_CATEGORIES, EXPENSE_CATEGORIES, type BazarCategory, type ExpenseCategory, type MealType, type PaymentMethod, type SplitMethod } from '@/lib/types'
import { PAYMENT_METHODS, SPLIT_LABEL } from '@/lib/permissions'
import { taka } from '@/lib/format'

export function QuickActionModals() {
  const q = useUI((s) => s.quickAction)
  const close = useUI((s) => s.closeQuick)
  return (
    <>
      <AddMealModal open={q === 'meal'} onClose={close} />
      <AddBazarModal open={q === 'bazar'} onClose={close} />
      <AddExpenseModal open={q === 'expense'} onClose={close} />
      <AddPaymentModal open={q === 'payment'} onClose={close} />
      <AddGuestModal open={q === 'guest'} onClose={close} />
      <AddLeaveModal open={q === 'leave'} onClose={close} />
      <InviteModal open={q === 'invite'} onClose={close} />
    </>
  )
}

function useMemberOptions() {
  const members = useActiveMembers()
  const current = useCurrentMember()
  const can = useCan()
  const canAll = can('manageMeals')
  const list = canAll ? members : members.filter((m) => m.id === current?.id)
  return { options: list.map((m) => ({ value: m.id, label: m.name })), defaultId: current?.id ?? list[0]?.id ?? '' }
}

// ---------------------------------------------------------------------------
function AddMealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { options, defaultId } = useMemberOptions()
  const setMeal = useStore((s) => s.setMeal)
  const toast = useUI((s) => s.toast)
  const meals = useStore((s) => s.db.meals)
  const messId = useStore((s) => s.currentMessId)

  const [memberId, setMemberId] = useState(defaultId)
  const [date, setDate] = useState(todayISO())
  const [l, setL] = useState(1)
  const [d, setD] = useState(1)

  useEffect(() => {
    if (!open) return
    const mid = defaultId
    setMemberId(mid)
    setDate(todayISO())
  }, [open, defaultId])

  useEffect(() => {
    // Opt-out model: lunch & dinner default ON; a stored row may cancel a slot.
    const existing = meals.find((m) => m.messId === messId && m.memberId === memberId && m.date === date)
    setL(existing ? (existing.lunch > 0 ? 1 : 0) : 1)
    setD(existing ? (existing.dinner > 0 ? 1 : 0) : 1)
  }, [memberId, date, meals, messId, open])

  const total = l + d
  const submit = () => {
    if (!memberId) return
    setMeal({ memberId, date, lunch: l, dinner: d })
    toast(total === 0 ? 'Meals cancelled' : 'Meal saved')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meal on / off"
      description="Lunch & dinner count automatically"
      icon={<UtensilsCrossed className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save · {total}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Member">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} options={options} />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {[
          { label: 'Lunch', v: l, set: setL, icon: <Sunset className="w-4 h-4 text-sky-500" /> },
          { label: 'Dinner', v: d, set: setD, icon: <Moon className="w-4 h-4 text-violet-500" /> },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between glass-panel rounded-2xl px-4 py-3">
            <span className="font-semibold text-ink-700 flex items-center gap-2">{row.icon}{row.label}</span>
            <Segmented
              value={row.v > 0 ? 'on' : 'off'}
              onChange={(v) => row.set(v === 'on' ? 1 : 0)}
              size="sm"
              options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
            />
          </div>
        ))}
        <p className="text-center text-xs text-ink-400">On by default — switch off to cancel (“meal off”).</p>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
interface Row { name: string; category: BazarCategory; qty: string; unit: string; price: string }
const emptyRow = (): Row => ({ name: '', category: 'Vegetables', qty: '', unit: '', price: '' })

function AddBazarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useActiveMembers()
  const current = useCurrentMember()
  const addBazar = useStore((s) => s.addBazar)
  const toast = useUI((s) => s.toast)

  const [date, setDate] = useState(todayISO())
  const [buyerId, setBuyerId] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(todayISO())
    setBuyerId(current?.id ?? members[0]?.id ?? '')
    setRows([emptyRow()])
    setNote('')
  }, [open])

  const total = rows.reduce((s, r) => s + (parseFloat(r.price) || 0), 0)
  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const submit = () => {
    const items = rows
      .filter((r) => r.name.trim() && parseFloat(r.price) > 0)
      .map((r) => ({
        name: r.name.trim(),
        category: r.category,
        qty: r.qty ? parseFloat(r.qty) : undefined,
        unit: r.unit || undefined,
        price: parseFloat(r.price),
      }))
    if (!items.length) return toast('Add at least one item with a price', 'error')
    if (!buyerId) return toast('Select a buyer', 'error')
    addBazar({ date, buyerMemberId: buyerId, items, note: note.trim() || undefined })
    toast('Bazar added')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Add bazar"
      icon={<ShoppingCart className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save · {taka(total)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Buyer">
            <Select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} options={members.map((m) => ({ value: m.id, label: m.name }))} />
          </Field>
        </div>

        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i} className="glass-panel rounded-2xl p-3 space-y-2.5">
              <div className="flex gap-2">
                <Input placeholder="Item name" value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} className="flex-1" />
                {rows.length > 1 && (
                  <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="w-11 grid place-items-center rounded-2xl text-rose-500 hover:bg-rose-500/10 transition shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Select value={r.category} onChange={(e) => setRow(i, { category: e.target.value as BazarCategory })} options={BAZAR_CATEGORIES.map((c) => ({ value: c, label: c }))} />
                <Input placeholder="Qty" inputMode="decimal" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
                <Input placeholder="Unit (kg)" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                <Input placeholder="Price ৳" inputMode="numeric" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} />
              </div>
            </div>
          ))}
          <Button variant="subtle" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setRows((rs) => [...rs, emptyRow()])}>
            Add item
          </Button>
        </div>

        <Field label="Note (optional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. weekly bazar" />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function AddExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useActiveMembers()
  const current = useCurrentMember()
  const mess = useMess()
  const addExpense = useStore((s) => s.addExpense)
  const toast = useUI((s) => s.toast)

  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState<ExpenseCategory>('Electricity')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [desc, setDesc] = useState('')
  const [split, setSplit] = useState<SplitMethod | ''>('')

  useEffect(() => {
    if (!open) return
    setDate(todayISO())
    setCategory('Electricity')
    setAmount('')
    setPaidBy(current?.id ?? members[0]?.id ?? '')
    setDesc('')
    setSplit('')
  }, [open])

  const effSplit = split || mess?.settings.categorySplit[category] || 'equal'

  const submit = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Enter a valid amount', 'error')
    if (!paidBy) return toast('Select who paid', 'error')
    addExpense({ date, category, amount: amt, paidByMemberId: paidBy, description: desc.trim() || undefined, split: split || undefined })
    toast('Expense added')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add expense"
      icon={<Receipt className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save expense</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Amount">
            <Input placeholder="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} leading={<span className="text-ink-500">৳</span>} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Paid by">
            <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} options={members.map((m) => ({ value: m.id, label: m.name }))} />
          </Field>
        </div>
        <Field label="Split method" hint={`Default for ${category}: ${SPLIT_LABEL[mess?.settings.categorySplit[category] ?? 'equal']}`}>
          <Segmented
            value={effSplit}
            onChange={(v) => setSplit(v)}
            options={[
              { value: 'equal', label: 'Equal' },
              { value: 'meal', label: 'Meal-based' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </Field>
        <Field label="Description (optional)">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. DESCO August bill" />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function AddPaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useActiveMembers()
  const current = useCurrentMember()
  const can = useCan()
  const addPayment = useStore((s) => s.addPayment)
  const toast = useUI((s) => s.toast)

  const list = can('manageSettlements') ? members : members.filter((m) => m.id === current?.id)
  const [memberId, setMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<PaymentMethod>('bKash')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setMemberId(current?.id ?? list[0]?.id ?? '')
    setAmount('')
    setDate(todayISO())
    setMethod('bKash')
    setNote('')
  }, [open])

  const submit = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Enter a valid amount', 'error')
    if (!memberId) return toast('Select a member', 'error')
    addPayment({ memberId, amount: amt, date, method, note: note.trim() || undefined })
    toast('Payment recorded')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add payment"
      icon={<Wallet className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Record payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Member">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} options={list.map((m) => ({ value: m.id, label: m.name }))} />
          </Field>
          <Field label="Amount">
            <Input placeholder="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} leading={<span className="text-ink-500">৳</span>} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. August deposit" />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function AddGuestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { options, defaultId } = useMemberOptions()
  const addGuestMeal = useStore((s) => s.addGuestMeal)
  const toast = useUI((s) => s.toast)

  const [hostId, setHostId] = useState(defaultId)
  const [guestName, setGuestName] = useState('')
  const [date, setDate] = useState(todayISO())
  const [type, setType] = useState<MealType>('lunch')
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!open) return
    setHostId(defaultId)
    setGuestName('')
    setDate(todayISO())
    setType('lunch')
    setCount(1)
  }, [open, defaultId])

  const submit = () => {
    if (!guestName.trim()) return toast('Enter a guest name', 'error')
    if (!hostId) return toast('Select a host', 'error')
    addGuestMeal({ hostMemberId: hostId, guestName, date, type, count })
    toast('Guest meal added')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add guest meal"
      description="Charged to the host member"
      icon={<Users2 className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Add guest meal</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Guest name">
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. Sakib" />
          </Field>
          <Field label="Host member">
            <Select value={hostId} onChange={(e) => setHostId(e.target.value)} options={options} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Meals">
            <Stepper value={count} onChange={setCount} min={1} max={20} />
          </Field>
        </div>
        <Field label="Meal type">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' },
            ]}
          />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function AddLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { options, defaultId } = useMemberOptions()
  const addLeave = useStore((s) => s.addLeave)
  const toast = useUI((s) => s.toast)

  const [memberId, setMemberId] = useState(defaultId)
  const [start, setStart] = useState(tomorrowISO())
  const [end, setEnd] = useState(tomorrowISO())
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setMemberId(defaultId)
    setStart(tomorrowISO())
    setEnd(tomorrowISO())
    setReason('')
  }, [open, defaultId])

  const submit = () => {
    if (!memberId) return
    const res = addLeave({ memberId, startDate: start, endDate: end, reason: reason.trim() || undefined })
    if (!res.ok) return toast(res.error!, 'error')
    toast('Leave scheduled')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Take leave"
      icon={<Palmtree className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Schedule leave</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Member">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} options={options} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Reason (optional)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. hometown trip" />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mess = useMess()
  const activeCount = useActiveMembers().length
  const toast = useUI((s) => s.toast)
  const [tab, setTab] = useState<'code' | 'link' | 'qr'>('code')
  const [copied, setCopied] = useState('')

  const link = useMemo(() => `${window.location.origin}/join?code=${mess?.code ?? ''}`, [mess?.code])

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    toast('Copied to clipboard')
    setTimeout(() => setCopied(''), 1500)
  }

  const full = mess ? activeCount >= mess.maxMembers : false

  return (
    <Modal open={open} onClose={onClose} title="Invite members" description={`${activeCount} / ${mess?.maxMembers ?? 0} members`} icon={<Users2 className="w-5 h-5" />}>
      <div className="space-y-4">
        {full && (
          <div className="rounded-2xl bg-amber-500/15 text-amber-300 px-4 py-3 text-sm font-medium">
            This mess is currently full. Increase the member limit in settings to invite more.
          </div>
        )}
        <Segmented
          className="w-full [&>button]:flex-1"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'code', label: 'Code' },
            { value: 'link', label: 'Link', icon: <Link2 className="w-4 h-4" /> },
            { value: 'qr', label: 'QR', icon: <QrCode className="w-4 h-4" /> },
          ]}
        />

        {tab === 'code' && (
          <div className="text-center py-4">
            <p className="text-sm text-ink-500 mb-3">Share this mess code</p>
            <div className="inline-flex items-center gap-3 glass-panel rounded-2xl px-6 py-4">
              <span className="font-mono font-extrabold text-3xl tracking-[0.3em] text-ink-900">{mess?.code}</span>
            </div>
            <div className="mt-4">
              <Button variant="secondary" icon={copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} onClick={() => copy(mess?.code ?? '', 'code')}>
                {copied === 'code' ? 'Copied' : 'Copy code'}
              </Button>
            </div>
          </div>
        )}

        {tab === 'link' && (
          <div className="py-2">
            <p className="text-sm text-ink-500 mb-2">Anyone with this link can join</p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button variant="secondary" size="icon" onClick={() => copy(link, 'link')}>
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {tab === 'qr' && (
          <div className="flex flex-col items-center py-4 gap-3">
            <QRCode value={link} />
            <p className="text-sm text-ink-500">Scan to join {mess?.name}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
