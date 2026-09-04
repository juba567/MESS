// Supabase data-access layer. Pure I/O: reads map rows -> entities; writes map
// entities/patches -> rows. Write helpers resolve to { error } so the store's
// background mirror can toast + reconcile on failure. Timestamps/ids are built
// by the store (client-generated text PKs), never here.
import { supabase } from '../supabase'
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
import * as M from './mappers'

export type WriteResult = { error: string | null }
type Row = Record<string, any>

function wrap(error: any): WriteResult {
  return { error: error ? (error.message ?? String(error)) : null }
}

// ---- reads -----------------------------------------------------------------

export async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return M.fromProfileRow(data)
}

/** My active memberships across all messes + the mess rows (powers the switcher). */
export async function fetchMyMemberships(
  userId: string,
): Promise<{ members: Member[]; messes: Mess[] }> {
  const { data, error } = await supabase
    .from('members')
    .select('*, mess:messes(*)')
    .eq('user_id', userId)
    .eq('active', true)
  if (error || !data) return { members: [], messes: [] }
  const members: Member[] = []
  const messes: Mess[] = []
  for (const row of data as Row[]) {
    members.push(M.fromMemberRow(row))
    if (row.mess) messes.push(M.fromMessRow(row.mess))
  }
  return { members, messes }
}

export interface MessData {
  members: Member[]
  meals: Meal[]
  guestMeals: GuestMeal[]
  bazars: Bazar[]
  expenses: Expense[]
  payments: Payment[]
  settlements: Settlement[]
}

/** Full working set for one mess (all members + all Phase-1 data tables). */
export async function loadMess(messId: string): Promise<MessData> {
  const [members, meals, guestMeals, bazars, expenses, payments, settlements] = await Promise.all([
    supabase.from('members').select('*').eq('mess_id', messId),
    supabase.from('meals').select('*').eq('mess_id', messId),
    supabase.from('guest_meals').select('*').eq('mess_id', messId),
    supabase.from('bazars').select('*').eq('mess_id', messId),
    supabase.from('expenses').select('*').eq('mess_id', messId),
    supabase.from('payments').select('*').eq('mess_id', messId),
    supabase.from('settlements').select('*').eq('mess_id', messId),
  ])
  return {
    members: (members.data ?? []).map(M.fromMemberRow),
    meals: (meals.data ?? []).map(M.fromMealRow),
    guestMeals: (guestMeals.data ?? []).map(M.fromGuestMealRow),
    bazars: (bazars.data ?? []).map(M.fromBazarRow),
    expenses: (expenses.data ?? []).map(M.fromExpenseRow),
    payments: (payments.data ?? []).map(M.fromPaymentRow),
    settlements: (settlements.data ?? []).map(M.fromSettlementRow),
  }
}

// ---- RPCs (RLS chicken-and-egg / self-service) -----------------------------

export async function rpcCreateMess(args: {
  p_mess_id: string
  p_member_id: string
  p_name: string
  p_max_members: number
  p_address: string | null
  p_start_date: string
  p_currency: string
  p_code: string
  p_settings: unknown
}): Promise<{ mess?: Mess; error: string | null }> {
  const { data, error } = await supabase.rpc('create_mess', args)
  if (error) return { error: error.message }
  return { mess: M.fromMessRow(data as Row), error: null }
}

export async function rpcJoinByCode(
  code: string,
  memberId: string,
): Promise<{ mess?: Mess; error: string | null }> {
  const { data, error } = await supabase.rpc('join_mess_by_code', {
    p_code: code,
    p_member_id: memberId,
  })
  if (error) return { error: error.message }
  return { mess: M.fromMessRow(data as Row), error: null }
}

export async function rpcLeaveMess(messId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc('leave_mess', { p_mess_id: messId })
  return wrap(error)
}

// ---- mess / member writes --------------------------------------------------

export async function deleteMess(messId: string): Promise<WriteResult> {
  const { error } = await supabase.from('messes').delete().eq('id', messId)
  return wrap(error)
}

export async function updateMess(messId: string, patch: Partial<Mess>): Promise<WriteResult> {
  const { error } = await supabase.from('messes').update(M.messPatchRow(patch)).eq('id', messId)
  return wrap(error)
}

export async function updateMessSettings(messId: string, settings: unknown): Promise<WriteResult> {
  const { error } = await supabase.from('messes').update({ settings }).eq('id', messId)
  return wrap(error)
}

export async function updateMember(id: string, patch: Partial<Member>): Promise<WriteResult> {
  const { error } = await supabase.from('members').update(M.memberPatchRow(patch)).eq('id', id)
  return wrap(error)
}

/** Promote one member to manager, demoting any previous manager (ordered). */
export async function assignManager(
  newManagerMemberId: string,
  prevManagerMemberId: string | null,
): Promise<WriteResult> {
  let r = await supabase.from('members').update({ role: 'manager' }).eq('id', newManagerMemberId)
  if (r.error) return wrap(r.error)
  if (prevManagerMemberId) {
    r = await supabase.from('members').update({ role: 'member' }).eq('id', prevManagerMemberId)
  }
  return wrap(r.error)
}

/**
 * Ordered ownership transfer. The caller stays owner (per mess_role, which reads
 * members.role) until the final self-demotion, so every write passes RLS.
 */
export async function transferOwnership(
  messId: string,
  newOwnerUserId: string,
  newOwnerMemberId: string,
  oldOwnerMemberId: string,
): Promise<WriteResult> {
  let r = await supabase.from('messes').update({ owner_id: newOwnerUserId }).eq('id', messId)
  if (r.error) return wrap(r.error)
  r = await supabase.from('members').update({ role: 'owner' }).eq('id', newOwnerMemberId)
  if (r.error) return wrap(r.error)
  r = await supabase.from('members').update({ role: 'member' }).eq('id', oldOwnerMemberId)
  return wrap(r.error)
}

// ---- profile writes --------------------------------------------------------

export async function updateProfile(
  userId: string,
  patch: { fullName?: string; contact?: string; avatarUrl?: string },
): Promise<WriteResult> {
  const row: Row = {}
  if (patch.fullName !== undefined) row.full_name = patch.fullName
  if (patch.contact !== undefined) row.contact = patch.contact
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
  const { error } = await supabase.from('profiles').update(row).eq('id', userId)
  return wrap(error)
}

export async function updateNotifPrefs(userId: string, prefs: unknown): Promise<WriteResult> {
  const { error } = await supabase.from('profiles').update({ notif_prefs: prefs }).eq('id', userId)
  return wrap(error)
}

export async function sendPasswordReset(email: string, redirectTo: string): Promise<WriteResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return wrap(error)
}

// ---- data-table writes -----------------------------------------------------

export async function upsertMeal(m: Meal): Promise<WriteResult> {
  const { error } = await supabase
    .from('meals')
    .upsert(M.toMealRow(m), { onConflict: 'mess_id,member_id,date' })
  return wrap(error)
}

export async function insertGuestMeal(g: GuestMeal): Promise<WriteResult> {
  const { error } = await supabase.from('guest_meals').insert(M.toGuestMealRow(g))
  return wrap(error)
}

export async function insertBazar(b: Bazar): Promise<WriteResult> {
  const { error } = await supabase.from('bazars').insert(M.toBazarRow(b))
  return wrap(error)
}

export async function updateBazar(id: string, patch: Partial<Bazar>): Promise<WriteResult> {
  const { error } = await supabase.from('bazars').update(M.bazarPatchRow(patch)).eq('id', id)
  return wrap(error)
}

export async function insertExpense(e: Expense): Promise<WriteResult> {
  const { error } = await supabase.from('expenses').insert(M.toExpenseRow(e))
  return wrap(error)
}

export async function updateExpense(id: string, patch: Partial<Expense>): Promise<WriteResult> {
  const { error } = await supabase.from('expenses').update(M.expensePatchRow(patch)).eq('id', id)
  return wrap(error)
}

export async function insertPayment(p: Payment): Promise<WriteResult> {
  const { error } = await supabase.from('payments').insert(M.toPaymentRow(p))
  return wrap(error)
}

export async function updatePayment(id: string, patch: Partial<Payment>): Promise<WriteResult> {
  const { error } = await supabase.from('payments').update(M.paymentPatchRow(patch)).eq('id', id)
  return wrap(error)
}

export async function upsertSettlement(s: Settlement): Promise<WriteResult> {
  const { error } = await supabase
    .from('settlements')
    .upsert(M.toSettlementRow(s), { onConflict: 'mess_id,month,from_member_id,to_member_id' })
  return wrap(error)
}

export type DataTable = 'guest_meals' | 'bazars' | 'expenses' | 'payments'

export async function deleteRow(table: DataTable, id: string): Promise<WriteResult> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  return wrap(error)
}
