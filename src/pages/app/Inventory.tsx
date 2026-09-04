import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Search, Minus, Trash2, Pencil, AlertTriangle, PackageX } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, Stat, Button, Badge, Chip, EmptyState, Modal, Field, Input } from '@/components/ui'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { useCan } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { cn } from '@/lib/cn'

type Filter = 'all' | 'low' | 'out'

export function Inventory() {
  const can = useCan()
  const canManage = can('manageInventory')
  const messId = useStore((s) => s.currentMessId)
  const inventoryAll = useStore((s) => s.db.inventory)
  const adjustStock = useStore((s) => s.adjustStock)
  const deleteInventory = useStore((s) => s.deleteInventory)
  const confirm = useUI((s) => s.confirm)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editId, setEditId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const items = useMemo(
    () => inventoryAll.filter((i) => i.messId === messId).sort((a, b) => a.name.localeCompare(b.name)),
    [inventoryAll, messId],
  )
  const lowCount = items.filter((i) => i.stock > 0 && i.stock <= i.lowThreshold).length
  const outCount = items.filter((i) => i.stock <= 0).length

  const shown = items
    .filter((i) => (filter === 'low' ? i.stock > 0 && i.stock <= i.lowThreshold : filter === 'out' ? i.stock <= 0 : true))
    .filter((i) => (!query.trim() ? true : i.name.toLowerCase().includes(query.toLowerCase())))

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Track kitchen stock & staples" icon={<Package className="w-5 h-5" />}>
        {canManage && <Button size="sm" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Add item</Button>}
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Items" value={items.length} icon={<Package className="w-5 h-5" />} tone="brand" />
        <Stat label="Low stock" value={lowCount} icon={<AlertTriangle className="w-5 h-5" />} tone="amber" />
        <Stat label="Out" value={outCount} icon={<PackageX className="w-5 h-5" />} tone="rose" />
      </div>

      <div className="space-y-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" leading={<Search className="w-4 h-4" />} />
        <div className="flex gap-2">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
          <Chip active={filter === 'low'} onClick={() => setFilter('low')}>Low stock</Chip>
          <Chip active={filter === 'out'} onClick={() => setFilter('out')}>Out of stock</Chip>
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={<Package className="w-7 h-7" />}
            title={items.length === 0 ? 'No inventory items' : 'Nothing matches'}
            message={items.length === 0 ? 'Add rice, oil, spices and other staples to track what needs restocking. Bazar purchases with matching names auto-add stock.' : 'Try a different filter or search.'}
            action={canManage && items.length === 0 ? <Button onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Add item</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {shown.map((i) => {
            const out = i.stock <= 0
            const low = !out && i.stock <= i.lowThreshold
            return (
              <Card key={i.id} hover className="p-4 flex items-center gap-3">
                <div className={cn('w-11 h-11 rounded-2xl grid place-items-center text-white shrink-0 bg-gradient-to-br', out ? 'from-rose-500 to-red-500' : low ? 'from-amber-400 to-orange-500' : 'from-emerald-500 to-teal-500')}>
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink-800 truncate">{i.name}</p>
                    {out && <Badge tone="rose">out</Badge>}
                    {low && <Badge tone="amber">low</Badge>}
                  </div>
                  <p className="text-xs text-ink-500">{i.stock} {i.unit} in stock · alert ≤ {i.lowThreshold}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="inline-flex items-center rounded-2xl border border-white/[0.10] bg-white/[0.06]">
                      <button onClick={() => adjustStock(i.id, -1)} disabled={i.stock <= 0} className="w-9 h-9 grid place-items-center rounded-l-2xl text-ink-500 hover:bg-white/[0.09] disabled:opacity-30 transition"><Minus className="w-4 h-4" /></button>
                      <span className="w-10 text-center font-bold tabular-nums text-ink-800">{i.stock}</span>
                      <button onClick={() => adjustStock(i.id, 1)} className="w-9 h-9 grid place-items-center rounded-r-2xl text-ink-500 hover:bg-white/[0.09] transition"><Plus className="w-4 h-4" /></button>
                    </div>
                    <Menu
                      trigger={({ toggle }) => (
                        <button onClick={toggle} className="w-8 h-8 grid place-items-center rounded-xl text-ink-400 hover:bg-white/[0.09] transition">⋯</button>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem icon={<Pencil className="w-4 h-4" />} onClick={() => { setEditId(i.id); close() }}>Edit</MenuItem>
                          <MenuItem
                            icon={<Trash2 className="w-4 h-4" />}
                            danger
                            onClick={async () => {
                              close()
                              if (await confirm({ title: `Delete ${i.name}?`, message: 'This inventory item will be removed.', danger: true, confirmText: 'Delete' }))
                                deleteInventory(i.id)
                            }}
                          >
                            Delete
                          </MenuItem>
                        </>
                      )}
                    </Menu>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <InventoryModal open={adding} editId={editId} onClose={() => { setAdding(false); setEditId(null) }} />
    </div>
  )
}

function InventoryModal({ open, editId, onClose }: { open: boolean; editId: string | null; onClose: () => void }) {
  const item = useStore((s) => (editId ? s.db.inventory.find((i) => i.id === editId) ?? null : null))
  const addInventory = useStore((s) => s.addInventory)
  const updateInventory = useStore((s) => s.updateInventory)
  const toast = useUI((s) => s.toast)

  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [stock, setStock] = useState('0')
  const [low, setLow] = useState('2')

  const isOpen = open || !!editId

  useEffect(() => {
    if (editId && item) {
      setName(item.name); setUnit(item.unit); setStock(item.stock.toString()); setLow(item.lowThreshold.toString())
    } else if (open) {
      setName(''); setUnit('kg'); setStock('0'); setLow('2')
    }
  }, [editId, item, open])

  const save = () => {
    if (!name.trim()) return toast('Enter an item name', 'error')
    const payload = { name: name.trim(), unit: unit.trim() || 'unit', stock: parseFloat(stock) || 0, lowThreshold: parseFloat(low) || 0 }
    if (editId) { updateInventory(editId, payload); toast('Item updated') }
    else { addInventory(payload); toast('Item added') }
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={editId ? 'Edit item' : 'Add inventory item'}
      icon={<Package className="w-5 h-5" />}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>{editId ? 'Save' : 'Add item'}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Item name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rice, Soybean oil" autoFocus /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Stock"><Input inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
          <Field label="Unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg / L / pcs" /></Field>
          <Field label="Alert ≤"><Input inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  )
}
