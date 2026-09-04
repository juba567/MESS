import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { QuickActionModals } from '@/components/quick/QuickActionModals'

export function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span className="animate-float-slow" />
      <span className="animate-float-slower" />
      <span className="animate-float-slow" />
    </div>
  )
}

export function AppShell() {
  return (
    <div className="min-h-screen">
      <Aurora />
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="px-3 sm:px-5 lg:px-8 pt-4 sm:pt-5 pb-safe lg:pb-12 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <QuickActionModals />
    </div>
  )
}
