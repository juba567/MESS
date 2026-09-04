import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, LogIn, Home, Users2, Calendar, MapPin, Sparkles, LogOut } from 'lucide-react'
import { Aurora } from '@/components/layout/AppShell'
import { Field, Input, Button, Segmented, Stepper } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import { useUser } from '@/hooks/useMess'
import { todayISO } from '@/lib/date'

export function Onboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const user = useUser()
  const createMess = useStore((s) => s.createMess)
  const joinByCode = useStore((s) => s.joinByCode)
  const logout = useStore((s) => s.logout)
  const myMesses = useStore((s) =>
    s.db.members
      .filter((m) => m.userId === s.currentUserId && m.active)
      .map((m) => s.db.messes.find((x) => x.id === m.messId)!)
      .filter(Boolean),
  )
  const switchMess = useStore((s) => s.switchMess)
  const toast = useUI((s) => s.toast)

  const [tab, setTab] = useState<'create' | 'join'>(params.get('code') ? 'join' : 'create')
  const [busy, setBusy] = useState(false)

  // create form
  const [name, setName] = useState('')
  const [maxMembers, setMaxMembers] = useState(6)
  const [address, setAddress] = useState('')
  const [startDate, setStartDate] = useState(todayISO())

  // join form
  const [code, setCode] = useState(params.get('code')?.toUpperCase() ?? '')

  useEffect(() => {
    const c = params.get('code')
    if (c) {
      setCode(c.toUpperCase())
      setTab('join')
    }
  }, [params])

  const create = async () => {
    if (!name.trim()) return toast('Give your mess a name', 'error')
    setBusy(true)
    const res = await createMess({ name, maxMembers, address, startDate })
    setBusy(false)
    if (!res.ok) return toast(res.error!, 'error')
    toast('Mess created 🎉')
    navigate('/app')
  }

  const join = async () => {
    if (!code.trim()) return toast('Enter a mess code', 'error')
    setBusy(true)
    const res = await joinByCode(code)
    setBusy(false)
    if (!res.ok) return toast(res.error!, 'error')
    toast('Joined the mess!')
    navigate('/app')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 sm:p-8">
      <Aurora />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white shadow-glow">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-display font-extrabold text-xl text-ink-900">Mess Manager</span>
        </div>

        <div className="glass-strong rounded-4xl shadow-glass-lg p-6 sm:p-8">
          <h1 className="font-display font-extrabold text-2xl text-ink-900">Hi {user?.fullName?.split(' ')[0] ?? 'there'} 👋</h1>
          <p className="text-ink-500 mt-1 mb-6">Create a new mess or join an existing one to get started.</p>

          <Segmented
            className="w-full [&>button]:flex-1 mb-6"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'create', label: 'Create mess', icon: <Plus className="w-4 h-4" /> },
              { value: 'join', label: 'Join mess', icon: <LogIn className="w-4 h-4" /> },
            ]}
          />

          {tab === 'create' ? (
            <div className="space-y-4">
              <Field label="Mess name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green View Mess" leading={<Home className="w-4 h-4" />} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max members" hint="You can change this later">
                  <div className="glass-input rounded-2xl px-3 py-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-500 text-sm"><Users2 className="w-4 h-4" /> Members</span>
                    <Stepper value={maxMembers} onChange={setMaxMembers} min={1} max={50} />
                  </div>
                </Field>
                <Field label="Starting date">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} leading={<Calendar className="w-4 h-4" />} />
                </Field>
              </div>
              <Field label="Address (optional)">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, area" leading={<MapPin className="w-4 h-4" />} />
              </Field>
              <Field label="Currency">
                <Input value="৳ BDT (Bangladeshi Taka)" readOnly className="text-ink-500" />
              </Field>
              <Button full size="lg" onClick={create} loading={busy} icon={<Plus className="w-5 h-5" />}>
                Create mess
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Mess code" hint="Ask your mess owner for the 6-character code">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="GM6X92"
                  className="font-mono tracking-[0.3em] text-center text-lg uppercase"
                  maxLength={6}
                />
              </Field>
              <Button full size="lg" onClick={join} loading={busy} icon={<LogIn className="w-5 h-5" />}>
                Join mess
              </Button>
            </div>
          )}

          {myMesses.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/[0.10]">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Your messes</p>
              <div className="space-y-2">
                {myMesses.map((m) => (
                  <button
                    key={m.id}
                    onClick={async () => {
                      await switchMess(m.id)
                      navigate('/app')
                    }}
                    className="w-full glass rounded-2xl px-3 py-2.5 flex items-center gap-3 hover:shadow-glass transition text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white font-bold">
                      {m.name[0]}
                    </div>
                    <span className="flex-1 font-semibold text-ink-800 truncate">{m.name}</span>
                    <span className="font-mono text-xs text-ink-400">{m.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={async () => { await logout(); navigate('/login') }} className="mt-5 mx-auto flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 transition">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </motion.div>
    </div>
  )
}
