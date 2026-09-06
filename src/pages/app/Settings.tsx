import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, User, Lock, Bell, Home, SlidersHorizontal, Split, Trash2, Save, Users, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, SectionTitle, Field, Input, Button, Segmented, Stepper, Avatar } from '@/components/ui'
import { useUser, useMess, useCan, useCurrentMember } from '@/hooks/useMess'
import { useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-store'
import {
  notificationPermission,
  requestNotificationPermission,
  showSystemNotification,
  type NotifPermission,
} from '@/lib/notify'
import { EXPENSE_CATEGORIES, type SplitMethod } from '@/lib/types'
import { cn } from '@/lib/cn'

export function Settings() {
  const navigate = useNavigate()
  const user = useUser()
  const mess = useMess()
  const me = useCurrentMember()
  const can = useCan()
  const toast = useUI((s) => s.toast)
  const confirm = useUI((s) => s.confirm)

  const canEditInfo = can('editGroupInfo')
  const canSettings = can('manageSettings')
  const isOwner = me?.role === 'owner'

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Profile, mess preferences & more" icon={<SettingsIcon className="w-5 h-5" />} />

      <ProfileCard />
      <PasswordCard />
      <NotifCard />

      {mess && (canEditInfo || canSettings) && (
        <>
          {canEditInfo && <MessInfoCard />}
          {canSettings && <PreferencesCard />}
          {canSettings && <CategorySplitCard />}
        </>
      )}

      <Card hover className="p-4">
        <button onClick={() => navigate('/app/members')} className="w-full flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white shrink-0"><Users className="w-5 h-5" /></div>
          <div className="flex-1">
            <p className="font-semibold text-ink-900">Members & roles</p>
            <p className="text-sm text-ink-500">Invite, assign managers, transfer ownership</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-300" />
        </button>
      </Card>

      {/* Danger zone */}
      <Card className="p-5 border border-rose-200/60">
        <SectionTitle title="Danger zone" subtitle="Irreversible actions" icon={<Trash2 className="w-5 h-5" />} />
        <div className="space-y-3">
          {mess && !isOwner && (
            <DangerRow
              title="Leave this mess"
              desc="You'll stop appearing in new months. Your history stays."
              btn="Leave mess"
              onClick={async () => {
                if (await confirm({ title: `Leave ${mess.name}?`, message: 'You can rejoin later with the mess code.', danger: true, confirmText: 'Leave' })) {
                  const r = await useStore.getState().leaveMess()
                  if (r.ok) { toast('You left the mess'); navigate('/onboarding') } else toast(r.error!, 'error')
                }
              }}
            />
          )}
          {mess && isOwner && (
            <DangerRow
              title="Delete this mess"
              desc="Permanently removes all members, meals, bazar, expenses and history."
              btn="Delete mess"
              onClick={async () => {
                if (await confirm({ title: `Delete ${mess.name}?`, message: 'This cannot be undone. Type the mess name to confirm.', danger: true, confirmText: 'Delete forever', requireText: mess.name })) {
                  const r = await useStore.getState().deleteMess(mess.id)
                  if (r.ok) { toast('Mess deleted'); navigate('/onboarding') } else toast(r.error!, 'error')
                }
              }}
            />
          )}
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------

function ProfileCard() {
  const user = useUser()
  const updateProfile = useStore((s) => s.updateProfile)
  const toast = useUI((s) => s.toast)
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [contact, setContact] = useState(user?.contact ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!fullName.trim()) return toast('Name cannot be empty', 'error')
    setSaving(true)
    const r = await updateProfile({ fullName: fullName.trim(), contact: contact.trim() })
    setSaving(false)
    toast(r.ok ? 'Profile saved' : r.error!, r.ok ? 'success' : 'error')
  }

  return (
    <Card className="p-5">
      <SectionTitle title="Profile" subtitle="Your account details" icon={<User className="w-5 h-5" />} />
      <div className="flex items-center gap-4 mb-4">
        <Avatar name={fullName || 'You'} color={user?.avatarColor} size="lg" ring />
        <div>
          <p className="font-semibold text-ink-900">{fullName}</p>
          <p className="text-sm text-ink-500">{contact}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Email"><Input value={contact} onChange={(e) => setContact(e.target.value)} type="email" /></Field>
      </div>
      <div className="flex justify-end mt-4"><Button onClick={save} loading={saving} icon={<Save className="w-4 h-4" />}>Save profile</Button></div>
    </Card>
  )
}

function PasswordCard() {
  const changePassword = useStore((s) => s.changePassword)
  const toast = useUI((s) => s.toast)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (next.length < 6) return toast('New password must be at least 6 characters', 'error')
    if (next !== confirmPw) return toast('Passwords do not match', 'error')
    setSaving(true)
    const r = await changePassword(cur, next)
    setSaving(false)
    if (r.ok) { toast('Password changed'); setCur(''); setNext(''); setConfirmPw('') } else toast(r.error!, 'error')
  }

  return (
    <Card className="p-5">
      <SectionTitle title="Password" subtitle="Change your password" icon={<Lock className="w-5 h-5" />} />
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Current"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirm new"><Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" /></Field>
      </div>
      <div className="flex justify-end mt-4"><Button variant="secondary" onClick={save} loading={saving} icon={<Lock className="w-4 h-4" />}>Update password</Button></div>
    </Card>
  )
}

function NotifCard() {
  const user = useUser()
  const updateNotifPrefs = useStore((s) => s.updateNotifPrefs)
  const prefs = user?.notifPrefs
  const rows: { key: keyof NonNullable<typeof prefs>; label: string; desc: string }[] = [
    { key: 'mealReminder', label: 'Meal reminders', desc: 'Daily nudge to log or book meals' },
    { key: 'bookingReminder', label: 'Booking cut-off', desc: 'Alert before the meal booking deadline' },
    { key: 'dueReminder', label: 'Payment dues', desc: 'Remind me when I owe the mess' },
    { key: 'activity', label: 'Mess activity', desc: 'Bazar, new members and other updates' },
  ]
  return (
    <Card className="p-5">
      <SectionTitle title="Notifications" subtitle="Choose what to be reminded about" icon={<Bell className="w-5 h-5" />} />
      <div className="space-y-1">
        <DeviceNotifRow />
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p className="font-medium text-ink-800">{r.label}</p>
              <p className="text-sm text-ink-500">{r.desc}</p>
            </div>
            <Switch checked={!!prefs?.[r.key]} onChange={(v) => updateNotifPrefs({ [r.key]: v })} />
          </div>
        ))}
      </div>
    </Card>
  )
}

// OS-level notification permission (separate from the in-app preferences above).
// Grants the app the right to raise system notifications — via the PWA service
// worker — when a teammate adds something while the app is closed/backgrounded.
function DeviceNotifRow() {
  const toast = useUI((s) => s.toast)
  const [perm, setPerm] = useState<NotifPermission>(() => notificationPermission())

  const enable = async () => {
    const p = await requestNotificationPermission()
    setPerm(p)
    if (p === 'granted') {
      toast('Device notifications enabled')
      void showSystemNotification("You're all set — new mess activity will show up here.")
    } else if (p === 'denied') {
      toast('Blocked — enable notifications in your browser settings', 'error')
    }
  }

  const desc =
    perm === 'granted' ? 'Alerts show even when the app is closed'
    : perm === 'denied' ? 'Blocked — turn on notifications in browser settings'
    : perm === 'unsupported' ? 'This browser doesn’t support notifications'
    : 'Get alerts even when the app is closed'

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 mb-1 border-b border-white/[0.06]">
      <div>
        <p className="font-medium text-ink-800">Device notifications</p>
        <p className="text-sm text-ink-500">{desc}</p>
      </div>
      {perm === 'granted' ? (
        <span className="text-sm font-semibold text-emerald-400 shrink-0">On</span>
      ) : perm === 'default' ? (
        <Button variant="secondary" onClick={enable}>Enable</Button>
      ) : (
        <span className="text-sm text-ink-400 shrink-0">{perm === 'denied' ? 'Blocked' : 'Unavailable'}</span>
      )}
    </div>
  )
}

function MessInfoCard() {
  const mess = useMess()
  const updateMess = useStore((s) => s.updateMess)
  const toast = useUI((s) => s.toast)
  const [name, setName] = useState(mess?.name ?? '')
  const [maxMembers, setMaxMembers] = useState(mess?.maxMembers ?? 6)
  const [address, setAddress] = useState(mess?.address ?? '')
  const [startDate, setStartDate] = useState(mess?.startDate ?? '')

  const save = () => {
    if (!name.trim()) return toast('Mess name cannot be empty', 'error')
    const r = updateMess({ name: name.trim(), maxMembers, address: address.trim() || undefined, startDate })
    toast(r.ok ? 'Mess updated' : r.error!, r.ok ? 'success' : 'error')
  }

  return (
    <Card className="p-5">
      <SectionTitle title="Mess information" subtitle="Group name and basics" icon={<Home className="w-5 h-5" />} />
      <div className="space-y-3">
        <Field label="Mess name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Member limit">
            <div className="flex items-center gap-3">
              <Stepper value={maxMembers} onChange={setMaxMembers} min={1} max={50} />
              <span className="text-sm text-ink-500">max members</span>
            </div>
          </Field>
          <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        </div>
        <Field label="Address (optional)"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, area" /></Field>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-ink-500">Invite code: <span className="font-mono font-bold text-ink-800 tracking-widest">{mess?.code}</span></span>
          <Button onClick={save} icon={<Save className="w-4 h-4" />}>Save</Button>
        </div>
      </div>
    </Card>
  )
}

function PreferencesCard() {
  const mess = useMess()
  const updateMessSettings = useStore((s) => s.updateMessSettings)
  const toast = useUI((s) => s.toast)
  const s = mess?.settings

  return (
    <Card className="p-5">
      <SectionTitle title="Mess preferences" subtitle="Meal cut-off and cost rules" icon={<SlidersHorizontal className="w-5 h-5" />} />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium text-ink-800">Meal booking cut-off</p>
            <p className="text-sm text-ink-500">Deadline to book the next day's meals</p>
          </div>
          <Input type="time" value={s?.mealCutoffTime ?? '21:00'} onChange={(e) => updateMessSettings({ mealCutoffTime: e.target.value })} className="w-36" />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium text-ink-800">Bazar split basis</p>
            <p className="text-sm text-ink-500">How grocery cost feeds the meal rate</p>
          </div>
          <Segmented
            value={s?.bazarSplit ?? 'meal'}
            onChange={(v) => updateMessSettings({ bazarSplit: v })}
            options={[{ value: 'meal', label: 'By meals' }, { value: 'equal', label: 'Equal' }]}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-ink-800">Manager can transfer ownership</p>
            <p className="text-sm text-ink-500">Allow the Main Manager to hand over ownership</p>
          </div>
          <Switch checked={!!s?.managerCanTransfer} onChange={(v) => { updateMessSettings({ managerCanTransfer: v }); toast('Preference saved') }} />
        </div>
      </div>
    </Card>
  )
}

function CategorySplitCard() {
  const mess = useMess()
  const setCategorySplit = useStore((s) => s.setCategorySplit)
  const splits = mess?.settings.categorySplit

  return (
    <Card className="p-5">
      <SectionTitle title="Expense split rules" subtitle="Default split for each category" icon={<Split className="w-5 h-5" />} />
      <p className="text-sm text-ink-500 mb-4">
        <span className="font-semibold text-brand-300">Meal-based</span> costs are shared by meals eaten (added to the meal rate). <span className="font-semibold text-ink-700">Equal</span> costs are split evenly among members.
      </p>
      <div className="space-y-1.5">
        {EXPENSE_CATEGORIES.map((c) => (
          <div key={c} className="flex items-center justify-between gap-3 py-1.5">
            <span className="font-medium text-ink-800">{c}</span>
            <Segmented
              size="sm"
              value={(splits?.[c] ?? 'equal') as SplitMethod}
              onChange={(v) => setCategorySplit(c, v)}
              options={[{ value: 'meal', label: 'Meal' }, { value: 'equal', label: 'Equal' }]}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

// ---- small pieces ----

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn('relative w-12 h-7 rounded-full transition-colors shrink-0', checked ? 'bg-gradient-to-br from-brand-500 to-violet-500' : 'bg-ink-300')}
      role="switch"
      aria-checked={checked}
    >
      <span className={cn('absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

function DangerRow({ title, desc, btn, onClick }: { title: string; desc: string; btn: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 glass-panel rounded-2xl p-3.5">
      <div className="min-w-0">
        <p className="font-semibold text-ink-800">{title}</p>
        <p className="text-sm text-ink-500">{desc}</p>
      </div>
      <Button variant="danger" size="sm" onClick={onClick} className="shrink-0">{btn}</Button>
    </div>
  )
}
