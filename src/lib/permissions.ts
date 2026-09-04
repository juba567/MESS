import type { ExpenseCategory, MessSettings, Role, SplitMethod } from './types'

export const DEFAULT_CATEGORY_SPLIT: Record<ExpenseCategory, SplitMethod> = {
  Gas: 'meal',
  Electricity: 'equal',
  WiFi: 'equal',
  Water: 'equal',
  Cleaning: 'equal',
  Maid: 'equal',
  Rent: 'equal',
  Cooking: 'meal',
  Maintenance: 'equal',
  Other: 'equal',
}

export const DEFAULT_MESS_SETTINGS: MessSettings = {
  mealCutoffTime: '21:00',
  bazarSplit: 'meal',
  categorySplit: { ...DEFAULT_CATEGORY_SPLIT },
  managerCanTransfer: false,
}

export const SPLIT_LABEL: Record<SplitMethod, string> = {
  equal: 'Equal split',
  meal: 'Meal-based',
  custom: 'Custom split',
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Group Owner',
  manager: 'Main Manager',
  member: 'Member',
}

export const ROLE_BADGE: Record<Role, string> = {
  owner: 'from-amber-400 to-orange-500',
  manager: 'from-indigo-500 to-violet-500',
  member: 'from-slate-400 to-slate-500',
}

export const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Bank', 'Other'] as const

// ---------------------------------------------------------------------------
// Role-based permission matrix (client-side enforcement).
// ---------------------------------------------------------------------------

export type Capability =
  | 'editGroupInfo'
  | 'changeMaxMembers'
  | 'inviteMembers'
  | 'removeMembers'
  | 'deleteGroup'
  | 'assignManager'
  | 'transferOwnership'
  | 'manageSettings'
  | 'manageMeals' // any member's meals
  | 'manageBazar'
  | 'manageExpenses'
  | 'manageInventory'
  | 'manageSettlements'
  | 'manageLeaveOfOthers'
  | 'viewReports'

const OWNER_CAPS: Capability[] = [
  'editGroupInfo',
  'changeMaxMembers',
  'inviteMembers',
  'removeMembers',
  'deleteGroup',
  'assignManager',
  'transferOwnership',
  'manageSettings',
  'manageMeals',
  'manageBazar',
  'manageExpenses',
  'manageInventory',
  'manageSettlements',
  'manageLeaveOfOthers',
  'viewReports',
]

const MANAGER_CAPS: Capability[] = [
  'inviteMembers',
  'manageMeals',
  'manageBazar',
  'manageExpenses',
  'manageInventory',
  'manageSettlements',
  'manageLeaveOfOthers',
  'viewReports',
]

const MEMBER_CAPS: Capability[] = ['viewReports']

export function roleCaps(role: Role, managerCanTransfer = false): Capability[] {
  if (role === 'owner') return OWNER_CAPS
  if (role === 'manager') return managerCanTransfer ? [...MANAGER_CAPS, 'transferOwnership'] : MANAGER_CAPS
  return MEMBER_CAPS
}

export function can(role: Role | undefined, cap: Capability, managerCanTransfer = false): boolean {
  if (!role) return false
  return roleCaps(role, managerCanTransfer).includes(cap)
}
