// ---------------------------------------------------------------------------
// Mess Manager — core domain types
// A single localStorage-backed "database" holds normalized records; every
// domain entity below is scoped to a mess via `messId` (except User).
// ---------------------------------------------------------------------------

export type ID = string
export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // full ISO timestamp
export type Month = string // 'YYYY-MM'

export type Role = 'owner' | 'manager' | 'member'
export type SplitMethod = 'equal' | 'meal' | 'custom'
export type MealType = 'breakfast' | 'lunch' | 'dinner'
export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Bank' | 'Other'

export const BAZAR_CATEGORIES = [
  'Rice',
  'Meat',
  'Fish',
  'Vegetables',
  'Grocery',
  'Oil',
  'Spices',
  'Drinks',
  'Other',
] as const
export type BazarCategory = (typeof BAZAR_CATEGORIES)[number]

export const EXPENSE_CATEGORIES = [
  'Gas',
  'Electricity',
  'WiFi',
  'Water',
  'Cleaning',
  'Maid',
  'Rent',
  'Cooking',
  'Maintenance',
  'Other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

// ---------------------------------------------------------------------------

export interface User {
  id: ID
  fullName: string
  /** email or phone — used as the login identifier */
  contact: string
  /** demo-only obfuscated password (legacy; unused since Supabase Auth) */
  passwordHash?: string
  avatarColor: string
  avatarUrl?: string
  createdAt: ISODateTime
  notifPrefs: {
    mealReminder: boolean
    dueReminder: boolean
    bookingReminder: boolean
    activity: boolean
  }
}

export interface MessSettings {
  /** 'HH:mm' deadline for booking tomorrow's meals */
  mealCutoffTime: string
  /** default split method used for the meal-rate basis (bazar) */
  bazarSplit: SplitMethod
  /** per-expense-category default split method */
  categorySplit: Record<ExpenseCategory, SplitMethod>
  /** allow the main manager to transfer ownership */
  managerCanTransfer: boolean
}

export interface Mess {
  id: ID
  name: string
  maxMembers: number
  address?: string
  startDate: ISODate
  currency: string // 'BDT'
  code: string // invite code e.g. GM6X92
  ownerId: ID // User.id
  createdAt: ISODateTime
  settings: MessSettings
}

export interface Member {
  id: ID // membership id (distinct from user id)
  messId: ID
  userId?: ID // linked account (present for real users; absent for seeded members)
  name: string
  contact?: string
  role: Role
  active: boolean
  joinedAt: ISODateTime
  leftAt?: ISODateTime
  avatarColor: string
}

export interface Meal {
  id: ID
  messId: ID
  memberId: ID
  date: ISODate
  breakfast: number
  lunch: number
  dinner: number
  updatedAt: ISODateTime
}

export interface GuestMeal {
  id: ID
  messId: ID
  hostMemberId: ID
  guestName: string
  date: ISODate
  type: MealType
  count: number
  createdAt: ISODateTime
}

/** Advance booking for a future date (meal cut-off system) */
export interface MealBooking {
  id: ID
  messId: ID
  memberId: ID
  date: ISODate
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  updatedAt: ISODateTime
}

export interface BazarItem {
  id: ID
  name: string
  category: BazarCategory
  qty?: number
  unit?: string
  price: number // total price for this line
}

export interface Bazar {
  id: ID
  messId: ID
  date: ISODate
  buyerMemberId: ID
  items: BazarItem[]
  note?: string
  receipt?: string // data URL (optional)
  createdAt: ISODateTime
}

export interface Expense {
  id: ID
  messId: ID
  date: ISODate
  category: ExpenseCategory
  amount: number
  paidByMemberId: ID
  description?: string
  /** overrides the mess category default when set */
  split?: SplitMethod
  /** memberId -> weight, only for custom split */
  customShares?: Record<ID, number>
  receipt?: string
  createdAt: ISODateTime
}

export interface Payment {
  id: ID
  messId: ID
  memberId: ID
  amount: number
  date: ISODate
  method: PaymentMethod
  note?: string
  createdAt: ISODateTime
}

export interface Leave {
  id: ID
  messId: ID
  memberId: ID
  startDate: ISODate
  endDate: ISODate
  reason?: string
  createdAt: ISODateTime
}

export interface InventoryItem {
  id: ID
  messId: ID
  name: string
  unit: string
  stock: number
  lowThreshold: number
  updatedAt: ISODateTime
}

/** A settled/pending money transfer between two members for a given month. */
export interface Settlement {
  id: ID
  messId: ID
  month: Month
  fromMemberId: ID
  toMemberId: ID
  amount: number
  settled: boolean
  settledAt?: ISODateTime
}

export interface Notification {
  id: ID
  messId: ID
  memberId?: ID // recipient membership (undefined = whole mess)
  text: string
  kind: 'meal' | 'booking' | 'due' | 'settlement' | 'member' | 'bazar' | 'leave' | 'info'
  read: boolean
  createdAt: ISODateTime
}

export interface Activity {
  id: ID
  messId: ID
  actorMemberId?: ID
  actorName: string
  text: string
  icon: string
  createdAt: ISODateTime
}

// ---------------------------------------------------------------------------

export interface Database {
  users: User[]
  messes: Mess[]
  members: Member[]
  meals: Meal[]
  guestMeals: GuestMeal[]
  bookings: MealBooking[]
  bazars: Bazar[]
  expenses: Expense[]
  payments: Payment[]
  leaves: Leave[]
  inventory: InventoryItem[]
  settlements: Settlement[]
  notifications: Notification[]
  activities: Activity[]
}

export const EMPTY_DB: Database = {
  users: [],
  messes: [],
  members: [],
  meals: [],
  guestMeals: [],
  bookings: [],
  bazars: [],
  expenses: [],
  payments: [],
  leaves: [],
  inventory: [],
  settlements: [],
  notifications: [],
  activities: [],
}
