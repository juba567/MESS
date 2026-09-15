import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Settings, User as UserIcon, UserPlus, Check, Plus, Sun, Moon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useMess, useUser } from '@/hooks/useMess'
import { useUI } from '@/lib/ui-store'
import { Avatar } from '@/components/ui/Avatar'
import { Menu, MenuItem } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'

export function Topbar() {
  const navigate = useNavigate()
  const user = useUser()
  const mess = useMess()
  const openQuick = useUI((s) => s.openQuick)
  const theme = useUI((s) => s.theme)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const logout = useStore((s) => s.logout)
  const switchMess = useStore((s) => s.switchMess)

  const myMesses = useStore((s) =>
    s.db.members.filter((m) => m.userId === s.currentUserId && m.active).map((m) => s.db.messes.find((x) => x.id === m.messId)!).filter(Boolean),
  )
  const unread = useStore((s) => s.db.notifications.filter((n) => n.messId === s.currentMessId && !n.read).length)

  return (
    <header className="sticky top-0 z-20 px-3 sm:px-5 lg:px-8 pt-3 sm:pt-4">
      <div className="glass rounded-3xl px-3 sm:px-4 h-16 flex items-center justify-between gap-2 shadow-glass-sm">
        {/* Mess switcher */}
        <Menu
          width="w-64"
          align="left"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl hover:bg-overlay/[0.08] transition min-w-0">
              <div className="w-9 h-9 rounded-xl grad-brand grid place-items-center text-white font-display font-bold shrink-0">
                {mess?.name?.[0] ?? 'M'}
              </div>
              <div className="min-w-0 text-left hidden xs:block sm:block">
                <p className="font-display font-bold text-ink-900 leading-tight truncate max-w-[38vw] sm:max-w-[220px]">
                  {mess?.name ?? 'Select mess'}
                </p>
                <p className="text-[11px] text-ink-500 font-mono tracking-wider">{mess?.code}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-ink-400 shrink-0" />
            </button>
          )}
        >
          {(close) => (
            <>
              <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Your messes</p>
              {myMesses.map((m) => (
                <MenuItem
                  key={m.id}
                  icon={<div className="w-6 h-6 rounded-lg grad-brand grid place-items-center text-white text-xs font-bold">{m.name[0]}</div>}
                  onClick={async () => {
                    await switchMess(m.id)
                    navigate('/app')
                    close()
                  }}
                >
                  <span className="flex-1 truncate">{m.name}</span>
                  {m.id === mess?.id && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                </MenuItem>
              ))}
              <div className="my-1 border-t border-line/[0.10]" />
              <MenuItem icon={<Plus className="w-4 h-4" />} onClick={() => { navigate('/onboarding'); close() }}>
                Create or join a mess
              </MenuItem>
            </>
          )}
        </Menu>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => openQuick('invite')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 transition"
          >
            <UserPlus className="w-4 h-4" /> Invite
          </button>

          <button
            onClick={toggleTheme}
            className="w-10 h-10 grid place-items-center rounded-2xl hover:bg-overlay/[0.08] transition text-ink-600"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => navigate('/app/notifications')}
            className="relative w-10 h-10 grid place-items-center rounded-2xl hover:bg-overlay/[0.08] transition text-ink-600"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <Menu
            trigger={({ toggle }) => (
              <button onClick={toggle} className="rounded-full hover:ring-2 hover:ring-line/[0.18] transition">
                <Avatar name={user?.fullName ?? '?'} color={user?.avatarColor} url={user?.avatarUrl} size="md" ring />
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="px-3 py-2">
                  <p className="font-semibold text-ink-900 text-sm truncate">{user?.fullName}</p>
                  <p className="text-xs text-ink-500 truncate">{user?.contact}</p>
                </div>
                <div className="my-1 border-t border-line/[0.10]" />
                <MenuItem icon={<UserIcon className="w-4 h-4" />} onClick={() => { navigate('/app/settings'); close() }}>
                  Profile
                </MenuItem>
                <MenuItem icon={<Settings className="w-4 h-4" />} onClick={() => { navigate('/app/settings'); close() }}>
                  Settings
                </MenuItem>
                <div className="my-1 border-t border-line/[0.10]" />
                <MenuItem icon={<LogOut className="w-4 h-4" />} danger onClick={async () => { await logout(); navigate('/login') }}>
                  Log out
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>
    </header>
  )
}
