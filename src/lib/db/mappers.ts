// Row ⇄ entity mapping for the Supabase persistence layer.
// Columns are the snake_case of each entity field; jsonb columns
// (notif_prefs, settings, items, custom_shares) pass through as JS objects.
// Money columns are `double precision` and arrive as JS numbers.
import type {
  Bazar,
  Expense,
  GuestMeal,
  Meal,
  Member,
  Mess,
  Payment,
  Settlement,
  User,
} from '../types'

type Row = Record<string, any>

// ---- reads: row -> entity --------------------------------------------------

export function fromProfileRow(r: Row): User {
  return {
    id: r.id,
    fullName: r.full_name ?? '',
    contact: r.contact ?? '',
    avatarColor: r.avatar_color ?? '',
    avatarUrl: r.avatar_url ?? undefined,
    createdAt: r.created_at,
    notifPrefs: r.notif_prefs ?? {
      mealReminder: true,
      dueReminder: true,
      bookingReminder: true,
      activity: true,
    },
  }
}

export function fromMessRow(r: Row): Mess {
  return {
    id: r.id,
    name: r.name,
    maxMembers: r.max_members,
    address: r.address ?? undefined,
    startDate: r.start_date,
    currency: r.currency ?? 'BDT',
    code: r.code,
    ownerId: r.owner_id,
    createdAt: r.created_at,
    settings: r.settings,
  }
}

export function fromMemberRow(r: Row): Member {
  return {
    id: r.id,
    messId: r.mess_id,
    userId: r.user_id ?? undefined,
    name: r.name,
    contact: r.contact ?? undefined,
    role: r.role,
    active: r.active,
    joinedAt: r.joined_at,
    leftAt: r.left_at ?? undefined,
    avatarColor: r.avatar_color ?? '',
  }
}

export function fromMealRow(r: Row): Meal {
  return {
    id: r.id,
    messId: r.mess_id,
    memberId: r.member_id,
    date: r.date,
    breakfast: r.breakfast ?? 0,
    lunch: r.lunch ?? 0,
    dinner: r.dinner ?? 0,
    updatedAt: r.updated_at,
  }
}

export function fromGuestMealRow(r: Row): GuestMeal {
  return {
    id: r.id,
    messId: r.mess_id,
    hostMemberId: r.host_member_id,
    guestName: r.guest_name,
    date: r.date,
    type: r.type,
    count: r.count ?? 1,
    createdAt: r.created_at,
  }
}

export function fromBazarRow(r: Row): Bazar {
  return {
    id: r.id,
    messId: r.mess_id,
    date: r.date,
    buyerMemberId: r.buyer_member_id,
    items: r.items ?? [],
    note: r.note ?? undefined,
    receipt: r.receipt ?? undefined,
    createdAt: r.created_at,
  }
}

export function fromExpenseRow(r: Row): Expense {
  return {
    id: r.id,
    messId: r.mess_id,
    date: r.date,
    category: r.category,
    amount: r.amount ?? 0,
    paidByMemberId: r.paid_by_member_id,
    description: r.description ?? undefined,
    split: r.split ?? undefined,
    customShares: r.custom_shares ?? undefined,
    receipt: r.receipt ?? undefined,
    createdAt: r.created_at,
  }
}

export function fromPaymentRow(r: Row): Payment {
  return {
    id: r.id,
    messId: r.mess_id,
    memberId: r.member_id,
    amount: r.amount ?? 0,
    date: r.date,
    method: r.method,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  }
}

export function fromSettlementRow(r: Row): Settlement {
  return {
    id: r.id,
    messId: r.mess_id,
    month: r.month,
    fromMemberId: r.from_member_id,
    toMemberId: r.to_member_id,
    amount: r.amount ?? 0,
    settled: r.settled ?? false,
    settledAt: r.settled_at ?? undefined,
  }
}

// ---- writes: entity -> row (full inserts / upserts) ------------------------

export function toMealRow(m: Meal): Row {
  return {
    id: m.id,
    mess_id: m.messId,
    member_id: m.memberId,
    date: m.date,
    breakfast: m.breakfast,
    lunch: m.lunch,
    dinner: m.dinner,
    updated_at: m.updatedAt,
  }
}

export function toGuestMealRow(g: GuestMeal): Row {
  return {
    id: g.id,
    mess_id: g.messId,
    host_member_id: g.hostMemberId,
    guest_name: g.guestName,
    date: g.date,
    type: g.type,
    count: g.count,
    created_at: g.createdAt,
  }
}

export function toBazarRow(b: Bazar): Row {
  return {
    id: b.id,
    mess_id: b.messId,
    date: b.date,
    buyer_member_id: b.buyerMemberId,
    items: b.items,
    note: b.note ?? null,
    receipt: b.receipt ?? null,
    created_at: b.createdAt,
  }
}

export function toExpenseRow(e: Expense): Row {
  return {
    id: e.id,
    mess_id: e.messId,
    date: e.date,
    category: e.category,
    amount: e.amount,
    paid_by_member_id: e.paidByMemberId,
    description: e.description ?? null,
    split: e.split ?? null,
    custom_shares: e.customShares ?? null,
    receipt: e.receipt ?? null,
    created_at: e.createdAt,
  }
}

export function toPaymentRow(p: Payment): Row {
  return {
    id: p.id,
    mess_id: p.messId,
    member_id: p.memberId,
    amount: p.amount,
    date: p.date,
    method: p.method,
    note: p.note ?? null,
    created_at: p.createdAt,
  }
}

export function toSettlementRow(s: Settlement): Row {
  return {
    id: s.id,
    mess_id: s.messId,
    month: s.month,
    from_member_id: s.fromMemberId,
    to_member_id: s.toMemberId,
    amount: s.amount,
    settled: s.settled,
    settled_at: s.settledAt ?? null,
  }
}

// ---- writes: partial patches -> row (only provided keys) -------------------

function pickRow(patch: Record<string, any>, map: Record<string, string>): Row {
  const out: Row = {}
  for (const [k, col] of Object.entries(map)) {
    if (k in patch && patch[k] !== undefined) out[col] = patch[k]
  }
  return out
}

const MESS_KEYS: Record<string, string> = {
  name: 'name',
  maxMembers: 'max_members',
  address: 'address',
  startDate: 'start_date',
  currency: 'currency',
  code: 'code',
  settings: 'settings',
}
const MEMBER_KEYS: Record<string, string> = {
  name: 'name',
  contact: 'contact',
  role: 'role',
  active: 'active',
  leftAt: 'left_at',
  avatarColor: 'avatar_color',
  userId: 'user_id',
}
const BAZAR_KEYS: Record<string, string> = {
  date: 'date',
  buyerMemberId: 'buyer_member_id',
  items: 'items',
  note: 'note',
  receipt: 'receipt',
}
const EXPENSE_KEYS: Record<string, string> = {
  date: 'date',
  category: 'category',
  amount: 'amount',
  paidByMemberId: 'paid_by_member_id',
  description: 'description',
  split: 'split',
  customShares: 'custom_shares',
  receipt: 'receipt',
}
const PAYMENT_KEYS: Record<string, string> = {
  memberId: 'member_id',
  amount: 'amount',
  date: 'date',
  method: 'method',
  note: 'note',
}

export const messPatchRow = (patch: Partial<Mess>): Row => pickRow(patch, MESS_KEYS)
export const memberPatchRow = (patch: Partial<Member>): Row => pickRow(patch, MEMBER_KEYS)
export const bazarPatchRow = (patch: Partial<Bazar>): Row => pickRow(patch, BAZAR_KEYS)
export const expensePatchRow = (patch: Partial<Expense>): Row => pickRow(patch, EXPENSE_KEYS)
export const paymentPatchRow = (patch: Partial<Payment>): Row => pickRow(patch, PAYMENT_KEYS)
