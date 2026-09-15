import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Plus, Search, Trash2, Pencil, Receipt, Package } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { MonthNav } from '@/components/common/MonthNav'
import { Card, Stat, Avatar, Button, Badge, Chip, EmptyState, Modal, Field, Input, Textarea, Select } from '@/components/ui'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { useMonthState } from '@/hooks/useMonth'
import { useActiveMembers, useCan, useCurrentMember } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { bazarTotal } from '@/lib/calc'
import { taka } from '@/lib/format'
import { shortDate, monthLabel } from '@/lib/date'
import { BAZAR_CATEGORIES, type BazarCategory, type Bazar as BazarT } from '@/lib/types'
import { cn } from '@/lib/cn'

export function Bazar() {
  const { month, prev, next, isCurrent } = useMonthState()
  const can = useCan()
  const canManage = can('manageBazar')
  const members = useActiveMembers()
  const bazarsAll = useStore((s) => s.db.bazars)
  const membersAll = useStore((s) => s.db.members)
  const messId = useStore((s) => s.currentMessId)
  const deleteBazar = useStore((s) => s.deleteBazar)
  const openQuick = useUI((s) => s.openQuick)
  const confirm = useUI((s) => s.confirm)

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<BazarCategory | 'all'>('all')
  const [editId, setEditId] = useState<string | null>(null)

  const nameOf = (id: string) => membersAll.find((m) => m.id === id)?.name ?? '—'

  const entries = useMemo(() => {
    return bazarsAll
      .filter((b) => b.messId === messId && b.date.slice(0, 7) === month)
      .filter((b) => (cat === 'all' ? true : b.items.some((it) => it.category === cat)))
      .filter((b) => {
        if (!query.trim()) return true
        const q = query.toLowerCase()
        return b.items.some((it) => it.name.toLowerCase().includes(q)) || nameOf(b.buyerMemberId).toLowerCase().includes(q)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [bazarsAll, messId, month, cat, query])

  const monthTotal = useMemo(
    () => bazarsAll.filter((b) => b.messId === messId && b.date.slice(0, 7) === month).reduce((s, b) => s + bazarTotal(b), 0),
    [bazarsAll, messId, month],
  )
  const catTotals = useMemo(() => {
    const map: Record<string, number> = {}
    bazarsAll
      .filter((b) => b.messId === messId && b.date.slice(0, 7) === month)
      .forEach((b) => b.items.forEach((it) => (map[it.category] = (map[it.category] || 0) + it.price)))
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [bazarsAll, messId, month])

  const count = bazarsAll.filter((b) => b.messId === messId && b.date.slice(0, 7) === month).length

  return (
    <div className="space-y-6">
      <PageHeader title="Bazar" subtitle={monthLabel(month)} icon={<ShoppingCart className="w-5 h-5" />}>
        <MonthNav month={month} onPrev={prev} onNext={next} canNext={!isCurrent} />
        <Button size="sm" onClick={() => openQuick('bazar')} icon={<Plus className="w-4 h-4" />} className="hidden sm:inline-flex">Add bazar</Button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Bazar this month" value={taka(monthTotal)} icon={<ShoppingCart className="w-5 h-5" />} tone="green" />
        <Stat label="Entries" value={count} icon={<Receipt className="w-5 h-5" />} tone="brand" />
        <Stat label="Top category" value={catTotals[0]?.[0] ?? '—'} sub={catTotals[0] ? taka(catTotals[0][1]) : undefined} icon={<Package className="w-5 h-5" />} tone="amber" />
        <Stat label="Avg / entry" value={taka(count ? monthTotal / count : 0)} icon={<Receipt className="w-5 h-5" />} tone="sky" />
      </div>

      {/* filters */}
      <div className="space-y-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items or buyer…" leading={<Search className="w-4 h-4" />} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
          {BAZAR_CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={<ShoppingCart className="w-7 h-7" />}
            title="No bazar entries"
            message="Log your first bazar to start tracking meal costs."
            action={<Button onClick={() => openQuick('bazar')} icon={<Plus className="w-4 h-4" />}>Add bazar</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((b) => (
            <Card key={b.id} hover className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={nameOf(b.buyerMemberId)} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-800 truncate">{nameOf(b.buyerMemberId)}</p>
                      <p className="text-xs text-ink-500">{shortDate(b.date)} · {b.items.length} item{b.items.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-display font-extrabold text-ink-900 text-lg">{taka(bazarTotal(b))}</span>
                      {canManage && (
                        <Menu
                          trigger={({ toggle }) => (
                            <button onClick={toggle} className="w-8 h-8 grid place-items-center rounded-xl text-ink-400 hover:bg-overlay/[0.09] transition">⋯</button>
                          )}
                        >
                          {(close) => (
                            <>
                              <MenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => { setEditId(b.id); close() }}>Edit</MenuItem>
                              <MenuItem
                                icon={<Trash2 className="w-4 h-4" />}
                                danger
                                onClick={async () => {
                                  close()
                                  if (await confirm({ title: 'Delete bazar entry?', message: `This ${taka(bazarTotal(b))} entry will be removed from records.`, danger: true, confirmText: 'Delete' }))
                                    deleteBazar(b.id)
                                }}
                              >
                                Delete
                              </MenuItem>
                            </>
                          )}
                        </Menu>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.items.map((it) => (
                      <span key={it.id} className="inline-flex items-center gap-1 text-xs bg-overlay/[0.08] border border-line/[0.10] rounded-full px-2.5 py-1 text-ink-600">
                        <span className="font-semibold text-ink-800">{it.name}</span>
                        {it.qty ? <span className="text-ink-400">{it.qty}{it.unit ? ` ${it.unit}` : ''}</span> : null}
                        <span className="text-ink-500">· {taka(it.price)}</span>
                      </span>
                    ))}
                  </div>
                  {b.note && <p className="text-xs text-ink-500 mt-2 italic">“{b.note}”</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BazarEditModal editId={editId} onClose={() => setEditId(null)} members={members} />
    </div>
  )
}

// ---- Edit modal (item rows) ----
interface Row { id?: string; name: string; category: BazarCategory; qty: string; unit: string; price: string }

function BazarEditModal({ editId, onClose, members }: { editId: string | null; onClose: () => void; members: ReturnType<typeof useActiveMembers> }) {
  const bazar = useStore((s) => (editId ? s.db.bazars.find((b) => b.id === editId) ?? null : null))
  const updateBazar = useStore((s) => s.updateBazar)
  const toast = useUI((s) => s.toast)

  const [date, setDate] = useState('')
  const [buyerId, setBuyerId] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!bazar) return
    setDate(bazar.date)
    setBuyerId(bazar.buyerMemberId)
    setRows(bazar.items.map((it) => ({ id: it.id, name: it.name, category: it.category, qty: it.qty?.toString() ?? '', unit: it.unit ?? '', price: it.price.toString() })))
    setNote(bazar.note ?? '')
  }, [bazar])

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const total = rows.reduce((s, r) => s + (parseFloat(r.price) || 0), 0)

  const save = () => {
    const items = rows
      .filter((r) => r.name.trim() && parseFloat(r.price) > 0)
      .map((r) => ({ id: r.id ?? 'it_' + Math.round(parseFloat(r.price)) + r.name, name: r.name.trim(), category: r.category, qty: r.qty ? parseFloat(r.qty) : undefined, unit: r.unit || undefined, price: parseFloat(r.price) }))
    if (!items.length) return toast('Add at least one item with a price', 'error')
    updateBazar(editId!, { date, buyerMemberId: buyerId, items, note: note.trim() || undefined })
    toast('Bazar updated')
    onClose()
  }

  return (
    <Modal
      open={!!editId}
      onClose={onClose}
      size="xl"
      title="Edit bazar"
      icon={<ShoppingCart className="w-5 h-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save · {taka(total)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Buyer"><Select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} options={members.map((m) => ({ value: m.id, label: m.name }))} /></Field>
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
                <Input placeholder="Unit" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                <Input placeholder="Price ৳" inputMode="numeric" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} />
              </div>
            </div>
          ))}
          <Button variant="subtle" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setRows((rs) => [...rs, { name: '', category: 'Vegetables', qty: '', unit: '', price: '' }])}>Add item</Button>
        </div>
        <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
