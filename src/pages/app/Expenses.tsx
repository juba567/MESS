import { useEffect, useMemo, useState } from 'react'
import { Receipt, Plus, Search, Trash2, Pencil, Flame, Split } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Stat, Avatar, Button, Badge, Chip, EmptyState, Modal, Field, Input, Select, Segmented } from '@/components/ui'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { useMonthState } from '@/hooks/useMonth'
import { useActiveMembers, useCan, useMess } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { taka } from '@/lib/format'
import { shortDate, monthLabel } from '@/lib/date'
import { SPLIT_LABEL } from '@/lib/permissions'
import { EXPENSE_CATEGORIES, type ExpenseCategory, type SplitMethod } from '@/lib/types'

export function Expenses() {
  const { month, prev, next, isCurrent } = useMonthState()
  const can = useCan()
  const canManage = can('manageExpenses')
  const mess = useMess()
  const expensesAll = useStore((s) => s.db.expenses)
  const membersAll = useStore((s) => s.db.members)
  const messId = useStore((s) => s.currentMessId)
  const deleteExpense = useStore((s) => s.deleteExpense)
  const openQuick = useUI((s) => s.openQuick)
  const confirm = useUI((s) => s.confirm)

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<ExpenseCategory | 'all'>('all')
  const [editId, setEditId] = useState<string | null>(null)

  const nameOf = (id: string) => membersAll.find((m) => m.id === id)?.name ?? '—'
  const splitOf = (e: (typeof expensesAll)[number]): SplitMethod => e.split ?? mess?.settings.categorySplit[e.category] ?? 'equal'

  const monthExpenses = useMemo(
    () => expensesAll.filter((e) => e.messId === messId && e.date.slice(0, 7) === month),
    [expensesAll, messId, month],
  )
  const entries = useMemo(() => {
    return monthExpenses
      .filter((e) => (cat === 'all' ? true : e.category === cat))
      .filter((e) => (!query.trim() ? true : (e.description ?? '').toLowerCase().includes(query.toLowerCase()) || e.category.toLowerCase().includes(query.toLowerCase())))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [monthExpenses, cat, query])

  const total = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const mealShare = monthExpenses.filter((e) => splitOf(e) === 'meal').reduce((s, e) => s + e.amount, 0)
  const otherShare = total - mealShare

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle={monthLabel(month)} icon={<Receipt className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
        <Button size="sm" onClick={() => openQuick('expense')} icon={<Plus className="w-4 h-4" />} className="hidden sm:inline-flex">Add expense</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total expenses" value={taka(total)} icon={<Receipt className="w-5 h-5" />} tone="amber" />
        <Stat label="Meal-based" value={taka(mealShare)} sub="added to meal rate" icon={<Flame className="w-5 h-5" />} tone="brand" />
        <Stat label="Split equally" value={taka(otherShare)} sub="shared by members" icon={<Split className="w-5 h-5" />} tone="sky" />
        <Stat label="Entries" value={monthExpenses.length} icon={<Receipt className="w-5 h-5" />} tone="violet" />
      </div>

      <div className="space-y-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search expenses…" leading={<Search className="w-4 h-4" />} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={<Receipt className="w-7 h-7" />}
            title="No expenses"
            message="Add gas, electricity, WiFi and other shared bills here."
            action={<Button onClick={() => openQuick('expense')} icon={<Plus className="w-4 h-4" />}>Add expense</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {entries.map((e) => (
            <Card key={e.id} hover className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-800">{e.category}</p>
                  <Badge tone={splitOf(e) === 'meal' ? 'brand' : 'sky'}>{SPLIT_LABEL[splitOf(e)]}</Badge>
                </div>
                <p className="text-xs text-ink-500 truncate">{shortDate(e.date)} · paid by {nameOf(e.paidByMemberId)}{e.description ? ` · ${e.description}` : ''}</p>
              </div>
              <span className="font-display font-extrabold text-ink-900 text-lg">{taka(e.amount)}</span>
              {canManage && (
                <Menu
                  trigger={({ toggle }) => (
                    <button onClick={toggle} className="w-8 h-8 grid place-items-center rounded-xl text-ink-400 hover:bg-white/[0.09] transition">⋯</button>
                  )}
                >
                  {(close) => (
                    <>
                      <MenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => { setEditId(e.id); close() }}>Edit</MenuItem>
                      <MenuItem
                        icon={<Trash2 className="w-4 h-4" />}
                        danger
                        onClick={async () => {
                          close()
                          if (await confirm({ title: 'Delete expense?', message: `This ${taka(e.amount)} ${e.category} expense will be removed.`, danger: true, confirmText: 'Delete' }))
                            deleteExpense(e.id)
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

      <ExpenseEditModal editId={editId} onClose={() => setEditId(null)} />
    </div>
  )
}

function ExpenseEditModal({ editId, onClose }: { editId: string | null; onClose: () => void }) {
  const expense = useStore((s) => (editId ? s.db.expenses.find((e) => e.id === editId) ?? null : null))
  const mess = useMess()
  const members = useActiveMembers()
  const updateExpense = useStore((s) => s.updateExpense)
  const toast = useUI((s) => s.toast)

  const [category, setCategory] = useState<ExpenseCategory>('Electricity')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [desc, setDesc] = useState('')
  const [split, setSplit] = useState<SplitMethod>('equal')

  useEffect(() => {
    if (!expense) return
    setCategory(expense.category)
    setAmount(expense.amount.toString())
    setDate(expense.date)
    setPaidBy(expense.paidByMemberId)
    setDesc(expense.description ?? '')
    setSplit(expense.split ?? mess?.settings.categorySplit[expense.category] ?? 'equal')
  }, [expense])

  const save = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Enter a valid amount', 'error')
    updateExpense(editId!, { category, amount: amt, date, paidByMemberId: paidBy, description: desc.trim() || undefined, split })
    toast('Expense updated')
    onClose()
  }

  return (
    <Modal
      open={!!editId}
      onClose={onClose}
      title="Edit expense"
      icon={<Receipt className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} /></Field>
          <Field label="Amount"><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} leading={<span className="text-ink-500">৳</span>} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Paid by"><Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} options={members.map((m) => ({ value: m.id, label: m.name }))} /></Field>
        </div>
        <Field label="Split method">
          <Segmented value={split} onChange={setSplit} options={[{ value: 'equal', label: 'Equal' }, { value: 'meal', label: 'Meal-based' }, { value: 'custom', label: 'Custom' }]} />
        </Field>
        <Field label="Description (optional)"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
