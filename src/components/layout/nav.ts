import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Receipt,
  Wallet,
  Users,
  Palmtree,
  Package,
  BarChart3,
  ArrowLeftRight,
  CalendarDays,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/meals', label: 'Meals', icon: UtensilsCrossed },
  { to: '/app/bazar', label: 'Bazar', icon: ShoppingCart },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
  { to: '/app/payments', label: 'Payments', icon: Wallet },
  { to: '/app/members', label: 'Members', icon: Users },
  { to: '/app/leave', label: 'Leave', icon: Palmtree },
  { to: '/app/inventory', label: 'Inventory', icon: Package },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/settlements', label: 'Settlements', icon: ArrowLeftRight },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

// Bottom-nav (mobile) primary destinations; the rest live under "More".
export const MOBILE_NAV: NavItem[] = [
  { to: '/app', label: 'Home', icon: LayoutDashboard },
  { to: '/app/meals', label: 'Meals', icon: UtensilsCrossed },
  { to: '/app/bazar', label: 'Bazar', icon: ShoppingCart },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
]
