import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { stopMessRealtime } from '@/lib/realtime'
import { EMPTY_DB } from '@/lib/types'
import { ToastHost, ConfirmHost } from '@/components/ui'
import { AppShell, Aurora } from '@/components/layout/AppShell'

// Auth & onboarding
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Forgot } from '@/pages/auth/Forgot'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Onboarding } from '@/pages/onboarding/Onboarding'

// App pages
import { Dashboard } from '@/pages/app/Dashboard'
import { Meals } from '@/pages/app/Meals'
import { Bazar } from '@/pages/app/Bazar'
import { Expenses } from '@/pages/app/Expenses'
import { Payments } from '@/pages/app/Payments'
import { Members } from '@/pages/app/Members'
import { MemberAccount } from '@/pages/app/MemberAccount'
import { Leave } from '@/pages/app/Leave'
import { Inventory } from '@/pages/app/Inventory'
import { Reports } from '@/pages/app/Reports'
import { Settlements } from '@/pages/app/Settlements'
import { Calendar } from '@/pages/app/Calendar'
import { Notifications } from '@/pages/app/Notifications'
import { Activity } from '@/pages/app/Activity'
import { Settings } from '@/pages/app/Settings'

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/** Only reachable when logged out (login / register / forgot). */
function PublicOnly() {
  const authed = useStore((s) => !!s.currentUserId)
  return authed ? <Navigate to="/app" replace /> : <Outlet />
}

/** Requires a signed-in user; otherwise bounces to /login. */
function RequireAuth() {
  const authed = useStore((s) => !!s.currentUserId)
  const loc = useLocation()
  return authed ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />
}

/** Requires an active mess; otherwise sends the user to onboarding. */
function RequireMess() {
  const hasMess = useStore((s) => !!s.currentMessId)
  return hasMess ? <AppShell /> : <Navigate to="/onboarding" replace />
}

/** Deep link: /join?code=XXXX — forward the code into onboarding's join tab. */
function JoinHandler() {
  const [params] = useSearchParams()
  const authed = useStore((s) => !!s.currentUserId)
  const code = (params.get('code') ?? '').trim()
  if (!authed) return <Navigate to="/login" replace />
  return <Navigate to={code ? `/onboarding?code=${encodeURIComponent(code)}` : '/onboarding'} replace />
}

// ---------------------------------------------------------------------------
// Hydration splash — shown until bootstrap() resolves the Supabase session and
// loads the active mess, avoiding a flash of the login screen for signed-in users.
// ---------------------------------------------------------------------------

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center">
      <Aurora />
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-brand-500 to-violet-500 grid place-items-center text-white shadow-glow animate-pulse">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="relative h-1.5 w-28 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function App() {
  const hydrated = useStore((s) => s.hydrated)

  useEffect(() => {
    // Load the current Supabase session (if any) → profile → active mess.
    void useStore.getState().bootstrap()
    // React to sign-out / token revocation from anywhere (other tabs, expiry).
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        stopMessRealtime()
        useStore.setState({ currentUserId: null, currentMessId: null, db: EMPTY_DB })
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!hydrated) return <Splash />

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Invite deep link */}
        <Route path="/join" element={<JoinHandler />} />

        {/* Password recovery — reachable with the recovery session active (which
            counts as authenticated), so it must sit outside PublicOnly. */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public (logged-out only) */}
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
        </Route>

        {/* Authenticated */}
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Inside a mess — AppShell provides sidebar/topbar/bottom-nav + <Outlet/> */}
          <Route path="/app" element={<RequireMess />}>
            <Route index element={<Dashboard />} />
            <Route path="meals" element={<Meals />} />
            <Route path="bazar" element={<Bazar />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="payments" element={<Payments />} />
            <Route path="members" element={<Members />} />
            <Route path="members/:id" element={<MemberAccount />} />
            <Route path="leave" element={<Leave />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settlements" element={<Settlements />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="activity" element={<Activity />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>

      {/* Global overlays (not part of AppShell so they cover auth screens too) */}
      <ToastHost />
      <ConfirmHost />
    </BrowserRouter>
  )
}
