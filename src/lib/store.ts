import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Bazar,
  BazarItem,
  Database,
  Expense,
  ExpenseCategory,
  GuestMeal,
  ID,
  InventoryItem,
  Leave,
  Meal,
  MealType,
  Member,
  Mess,
  Month,
  Notification,
  Payment,
  PaymentMethod,
  Role,
  Settlement,
  SplitMethod,
  User,
} from './types'
import { EMPTY_DB } from './types'
import { uid, inviteCode } from './id'
import { avatarColor } from './format'
import { DEFAULT_MESS_SETTINGS } from './permissions'
import { settleKey } from './calc'
import { supabase, hasSupabaseEnv } from './supabase'
import { useUI } from './ui-store'
import * as repo from './db/repo'

type Result = { ok: boolean; error?: string; id?: string; needsEmailConfirm?: boolean }

const DEFAULT_NOTIF_PREFS: User['notifPrefs'] = {
  mealReminder: true,
  dueReminder: true,
  bookingReminder: true,
  activity: true,
}

interface AppState {
  db: Database
  currentUserId: ID | null
  currentMessId: ID | null
  lastContact: string | null
  hydrated: boolean

  // --- load / session ---
  bootstrap(): Promise<void>
  loadMess(messId: ID): Promise<void>

  // --- auth ---
  register(input: { fullName: string; contact: string; password: string }): Promise<Result>
  login(input: { contact: string; password: string; remember?: boolean }): Promise<Result>
  logout(): Promise<void>
  sendPasswordReset(email: string): Promise<Result>
  completePasswordReset(next: string): Promise<Result>
  updateProfile(patch: Partial<Pick<User, 'fullName' | 'contact' | 'avatarUrl'>>): Promise<Result>
  changePassword(current: string, next: string): Promise<Result>
  updateNotifPrefs(patch: Partial<User['notifPrefs']>): void

  // --- mess lifecycle ---
  createMess(input: {
    name: string
    maxMembers: number
    address?: string
    startDate: string
    currency?: string
  }): Promise<Result>
  joinByCode(code: string): Promise<Result>
  switchMess(id: ID | null): Promise<void>
  updateMess(patch: Partial<Pick<Mess, 'name' | 'maxMembers' | 'address' | 'startDate' | 'currency'>>): Result
  updateMessSettings(patch: Partial<Mess['settings']>): void
  setCategorySplit(category: ExpenseCategory, method: SplitMethod): void
  deleteMess(id: ID): Promise<Result>

  // --- members ---
  assignManager(memberId: ID): Result
  removeManager(memberId: ID): Result
  removeMember(memberId: ID): Result
  transferOwnership(memberId: ID): Result
  leaveMess(): Promise<Result>

  // --- meals ---
  setMeal(input: { memberId: ID; date: string; breakfast: number; lunch: number; dinner: number }): void
  addGuestMeal(input: { hostMemberId: ID; guestName: string; date: string; type: MealType; count: number }): Result
  deleteGuestMeal(id: ID): void
  setBooking(input: { memberId: ID; date: string; breakfast: boolean; lunch: boolean; dinner: boolean }): void

  // --- bazar ---
  addBazar(input: { date: string; buyerMemberId: ID; items: Omit<BazarItem, 'id'>[]; note?: string; receipt?: string }): Result
  updateBazar(id: ID, patch: Partial<Pick<Bazar, 'date' | 'buyerMemberId' | 'items' | 'note' | 'receipt'>>): void
  deleteBazar(id: ID): void

  // --- expenses ---
  addExpense(input: Omit<Expense, 'id' | 'messId' | 'createdAt'>): Result
  updateExpense(id: ID, patch: Partial<Expense>): void
  deleteExpense(id: ID): void

  // --- payments ---
  addPayment(input: { memberId: ID; amount: number; date: string; method: PaymentMethod; note?: string }): Result
  updatePayment(id: ID, patch: Partial<Payment>): void
  deletePayment(id: ID): void

  // --- leave (local-only in Phase 1) ---
  addLeave(input: { memberId: ID; startDate: string; endDate: string; reason?: string }): Result
  deleteLeave(id: ID): void

  // --- inventory (local-only in Phase 1) ---
  addInventory(input: Omit<InventoryItem, 'id' | 'messId' | 'updatedAt'>): Result
  updateInventory(id: ID, patch: Partial<InventoryItem>): void
  adjustStock(id: ID, delta: number): void
  deleteInventory(id: ID): void

  // --- settlements ---
  toggleSettlement(input: { month: Month; fromId: ID; toId: ID; amount: number; settled: boolean }): void

  // --- notifications (local-only in Phase 1) ---
  markNotifRead(id: ID): void
  markAllNotifsRead(): void
  clearNotifs(): void
}

// helpers -------------------------------------------------------------------

const now = () => new Date().toISOString()

function findMember(db: Database, messId: ID | null, userId: ID | null): Member | undefined {
  if (!messId || !userId) return undefined
  return db.members.find((m) => m.messId === messId && m.userId === userId)
}

function friendlyAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox.'
  if (/user already registered/i.test(msg)) return 'An account with this email already exists.'
  return msg
}

/**
 * Fire a background Supabase write. On failure, toast and re-fetch the active
 * mess so local state reconciles with the server (write-through cache).
 */
function mirror(p: Promise<repo.WriteResult>): void {
  p.then((res) => {
    if (res.error) reconcile('Could not save to the server — refreshing…')
  }).catch(() => reconcile('Network error while saving — refreshing…'))
}

function reconcile(message: string): void {
  useUI.getState().toast(message, 'error')
  const id = useStore.getState().currentMessId
  if (id) void useStore.getState().loadMess(id)
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      // internal mutators (not exposed) ------------------------------------
      const patchDb = (fn: (db: Database) => Partial<Database>) =>
        set((s) => ({ db: { ...s.db, ...fn(s.db) } }))

      const logActivity = (messId: ID, text: string, icon: string, actorMemberId?: ID) => {
        const s = get()
        const actor = actorMemberId
          ? s.db.members.find((m) => m.id === actorMemberId)
          : findMember(s.db, messId, s.currentUserId)
        const activity = {
          id: uid('act'),
          messId,
          actorMemberId: actor?.id,
          actorName: actor?.name ?? 'System',
          text,
          icon,
          createdAt: now(),
        }
        set((st) => ({ db: { ...st.db, activities: [activity, ...st.db.activities].slice(0, 500) } }))
      }

      const notify = (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
        const notification: Notification = { ...n, id: uid('ntf'), read: false, createdAt: now() }
        set((st) => ({ db: { ...st.db, notifications: [notification, ...st.db.notifications].slice(0, 300) } }))
      }

      const requireMess = () => {
        const { currentMessId } = get()
        if (!currentMessId) throw new Error('No active mess')
        return currentMessId
      }

      // load the signed-in user's profile + mess list, then the active mess
      const hydrateForUser = async (userId: ID) => {
        const [profile, mine] = await Promise.all([
          repo.fetchProfile(userId),
          repo.fetchMyMemberships(userId),
        ])
        const user: User =
          profile ?? {
            id: userId,
            fullName: '',
            contact: get().lastContact ?? '',
            avatarColor: '',
            createdAt: now(),
            notifPrefs: { ...DEFAULT_NOTIF_PREFS },
          }
        const messes = mine.messes
        const persisted = get().currentMessId
        const activeId = messes.find((m) => m.id === persisted)?.id ?? messes[0]?.id ?? null
        set({
          db: { ...EMPTY_DB, users: [user], messes, members: mine.members },
          currentUserId: userId,
          currentMessId: activeId,
        })
        if (activeId) await get().loadMess(activeId)
      }

      return {
        db: EMPTY_DB,
        currentUserId: null,
        currentMessId: null,
        lastContact: null,
        hydrated: false,

        // ---- LOAD / SESSION ----
        async bootstrap() {
          try {
            if (!hasSupabaseEnv) {
              set({ currentUserId: null, currentMessId: null, db: EMPTY_DB })
              return
            }
            const { data } = await supabase.auth.getSession()
            const session = data.session
            if (!session?.user) {
              set({ currentUserId: null, currentMessId: null, db: EMPTY_DB })
              return
            }
            await hydrateForUser(session.user.id)
          } catch {
            set({ currentUserId: null, currentMessId: null, db: EMPTY_DB })
          } finally {
            set({ hydrated: true })
          }
        },

        async loadMess(messId) {
          const data = await repo.loadMess(messId)
          set((s) => ({
            db: {
              ...s.db,
              members: [...s.db.members.filter((m) => m.messId !== messId), ...data.members],
              meals: [...s.db.meals.filter((m) => m.messId !== messId), ...data.meals],
              guestMeals: [...s.db.guestMeals.filter((m) => m.messId !== messId), ...data.guestMeals],
              bazars: [...s.db.bazars.filter((m) => m.messId !== messId), ...data.bazars],
              expenses: [...s.db.expenses.filter((m) => m.messId !== messId), ...data.expenses],
              payments: [...s.db.payments.filter((m) => m.messId !== messId), ...data.payments],
              settlements: [...s.db.settlements.filter((m) => m.messId !== messId), ...data.settlements],
            },
          }))
        },

        // ---- AUTH ----
        async register({ fullName, contact, password }) {
          const email = contact.trim()
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { fullName: fullName.trim(), contact: email, avatarColor: avatarColor(fullName) } },
          })
          if (error) return { ok: false, error: friendlyAuthError(error.message) }
          if (!data.user) return { ok: false, error: 'Registration failed. Please try again.' }
          set({ lastContact: email })
          if (!data.session) {
            // email confirmation is ON — user must click the link before signing in
            return { ok: true, id: data.user.id, needsEmailConfirm: true }
          }
          await hydrateForUser(data.user.id)
          return { ok: true, id: data.user.id }
        },

        async login({ contact, password, remember }) {
          const email = contact.trim()
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) return { ok: false, error: friendlyAuthError(error.message) }
          set({ lastContact: remember ? email : get().lastContact })
          await hydrateForUser(data.user.id)
          return { ok: true, id: data.user.id }
        },

        async logout() {
          await supabase.auth.signOut()
          set({ currentUserId: null, currentMessId: null, db: EMPTY_DB })
        },

        async sendPasswordReset(email) {
          const redirectTo = `${window.location.origin}/reset-password`
          const { error } = await repo.sendPasswordReset(email.trim(), redirectTo)
          if (error) return { ok: false, error }
          return { ok: true }
        },

        async completePasswordReset(next) {
          const { error } = await supabase.auth.updateUser({ password: next })
          if (error) return { ok: false, error: error.message }
          return { ok: true }
        },

        async updateProfile(patch) {
          const userId = get().currentUserId
          if (!userId) return { ok: false, error: 'Not signed in.' }
          if (patch.contact !== undefined) {
            const email = patch.contact.trim()
            const cur = get().db.users.find((u) => u.id === userId)?.contact
            if (email && email !== cur) {
              const { error } = await supabase.auth.updateUser({ email })
              if (error) return { ok: false, error: error.message }
            }
          }
          const { error } = await repo.updateProfile(userId, {
            fullName: patch.fullName,
            contact: patch.contact,
            avatarUrl: patch.avatarUrl,
          })
          if (error) return { ok: false, error }
          patchDb((db) => ({
            users: db.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
            // keep member display name in sync (server trigger does this too)
            members: patch.fullName
              ? db.members.map((m) => (m.userId === userId ? { ...m, name: patch.fullName! } : m))
              : db.members,
          }))
          return { ok: true }
        },

        async changePassword(current, next) {
          const email = get().db.users.find((u) => u.id === get().currentUserId)?.contact
          if (!email) return { ok: false, error: 'Not signed in.' }
          const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: current })
          if (e1) return { ok: false, error: 'Current password is incorrect.' }
          const { error: e2 } = await supabase.auth.updateUser({ password: next })
          if (e2) return { ok: false, error: e2.message }
          return { ok: true }
        },

        updateNotifPrefs(patch) {
          const id = get().currentUserId
          if (!id) return
          const current = get().db.users.find((u) => u.id === id)?.notifPrefs ?? DEFAULT_NOTIF_PREFS
          const merged = { ...current, ...patch }
          patchDb((db) => ({ users: db.users.map((u) => (u.id === id ? { ...u, notifPrefs: merged } : u)) }))
          mirror(repo.updateNotifPrefs(id, merged))
        },

        // ---- MESS ----
        async createMess({ name, maxMembers, address, startDate, currency }) {
          const userId = get().currentUserId
          if (!userId) return { ok: false, error: 'Not signed in.' }
          const user = get().db.users.find((u) => u.id === userId)
          if (!user) return { ok: false, error: 'Not signed in.' }
          const messId = uid('mess')
          const memberId = uid('mem')
          const settings = JSON.parse(JSON.stringify(DEFAULT_MESS_SETTINGS))
          const code = inviteCode(name)
          const { mess, error } = await repo.rpcCreateMess({
            p_mess_id: messId,
            p_member_id: memberId,
            p_name: name.trim(),
            p_max_members: Math.max(1, Math.floor(maxMembers)),
            p_address: address?.trim() || null,
            p_start_date: startDate,
            p_currency: currency || 'BDT',
            p_code: code,
            p_settings: settings,
          })
          if (error || !mess) return { ok: false, error: error || 'Could not create the mess.' }
          const owner: Member = {
            id: memberId,
            messId: mess.id,
            userId,
            name: user.fullName,
            contact: user.contact,
            role: 'owner',
            active: true,
            joinedAt: now(),
            avatarColor: user.avatarColor,
          }
          patchDb((db) => ({
            messes: [...db.messes.filter((m) => m.id !== mess.id), mess],
            members: [...db.members.filter((m) => m.messId !== mess.id), owner],
          }))
          set({ currentMessId: mess.id })
          logActivity(mess.id, `created the mess “${mess.name}”`, 'sparkles', owner.id)
          return { ok: true, id: mess.id }
        },

        async joinByCode(code) {
          const userId = get().currentUserId
          if (!userId) return { ok: false, error: 'Not signed in.' }
          const memberId = uid('mem')
          const { mess, error } = await repo.rpcJoinByCode(code.trim(), memberId)
          if (error || !mess) return { ok: false, error: error || 'Could not join the mess.' }
          set((s) => ({
            db: { ...s.db, messes: [...s.db.messes.filter((m) => m.id !== mess.id), mess] },
            currentMessId: mess.id,
          }))
          await get().loadMess(mess.id)
          logActivity(mess.id, `joined the mess`, 'user-plus')
          return { ok: true, id: mess.id }
        },

        async switchMess(id) {
          set({ currentMessId: id })
          if (id) await get().loadMess(id)
        },

        updateMess(patch) {
          const messId = get().currentMessId
          if (!messId) return { ok: false, error: 'No active mess.' }
          if (patch.maxMembers != null) {
            const activeCount = get().db.members.filter((m) => m.messId === messId && m.active).length
            if (patch.maxMembers < activeCount) {
              return { ok: false, error: `Limit can't be below current active members (${activeCount}).` }
            }
          }
          patchDb((db) => ({ messes: db.messes.map((m) => (m.id === messId ? { ...m, ...patch } : m)) }))
          logActivity(messId, 'updated mess information', 'settings')
          mirror(repo.updateMess(messId, patch))
          return { ok: true }
        },

        updateMessSettings(patch) {
          const messId = get().currentMessId
          if (!messId) return
          const mess = get().db.messes.find((m) => m.id === messId)
          if (!mess) return
          const merged = { ...mess.settings, ...patch }
          patchDb((db) => ({ messes: db.messes.map((m) => (m.id === messId ? { ...m, settings: merged } : m)) }))
          logActivity(messId, 'updated mess settings', 'sliders')
          mirror(repo.updateMessSettings(messId, merged))
        },

        setCategorySplit(category, method) {
          const messId = get().currentMessId
          if (!messId) return
          const mess = get().db.messes.find((m) => m.id === messId)
          if (!mess) return
          const merged = {
            ...mess.settings,
            categorySplit: { ...mess.settings.categorySplit, [category]: method },
          }
          patchDb((db) => ({ messes: db.messes.map((m) => (m.id === messId ? { ...m, settings: merged } : m)) }))
          mirror(repo.updateMessSettings(messId, merged))
        },

        async deleteMess(id) {
          const userId = get().currentUserId
          const mess = get().db.messes.find((m) => m.id === id)
          if (!mess) return { ok: false, error: 'Mess not found.' }
          if (mess.ownerId !== userId) return { ok: false, error: 'Only the group owner can delete the mess.' }
          const { error } = await repo.deleteMess(id)
          if (error) return { ok: false, error }
          patchDb((db) => ({
            messes: db.messes.filter((m) => m.id !== id),
            members: db.members.filter((m) => m.messId !== id),
            meals: db.meals.filter((m) => m.messId !== id),
            guestMeals: db.guestMeals.filter((m) => m.messId !== id),
            bookings: db.bookings.filter((m) => m.messId !== id),
            bazars: db.bazars.filter((m) => m.messId !== id),
            expenses: db.expenses.filter((m) => m.messId !== id),
            payments: db.payments.filter((m) => m.messId !== id),
            leaves: db.leaves.filter((m) => m.messId !== id),
            inventory: db.inventory.filter((m) => m.messId !== id),
            settlements: db.settlements.filter((m) => m.messId !== id),
            notifications: db.notifications.filter((m) => m.messId !== id),
            activities: db.activities.filter((m) => m.messId !== id),
          }))
          set({ currentMessId: null })
          return { ok: true }
        },

        // ---- MEMBERS ----
        assignManager(memberId) {
          const messId = get().currentMessId!
          const prevManager = get().db.members.find(
            (m) => m.messId === messId && m.role === 'manager' && m.id !== memberId,
          )
          patchDb((db) => ({
            members: db.members.map((m) => {
              if (m.messId !== messId) return m
              if (m.id === memberId) return { ...m, role: 'manager' as Role }
              if (m.role === 'manager') return { ...m, role: 'member' as Role } // only one manager
              return m
            }),
          }))
          const mem = get().db.members.find((m) => m.id === memberId)
          logActivity(messId, `assigned ${mem?.name} as Main Manager`, 'shield')
          notify({ messId, memberId, text: `You are now the Main Manager`, kind: 'member' })
          mirror(repo.assignManager(memberId, prevManager?.id ?? null))
          return { ok: true }
        },

        removeManager(memberId) {
          const messId = get().currentMessId!
          patchDb((db) => ({
            members: db.members.map((m) =>
              m.id === memberId && m.messId === messId ? { ...m, role: 'member' as Role } : m,
            ),
          }))
          mirror(repo.updateMember(memberId, { role: 'member' }))
          return { ok: true }
        },

        removeMember(memberId) {
          const messId = get().currentMessId!
          const mem = get().db.members.find((m) => m.id === memberId)
          if (!mem) return { ok: false, error: 'Member not found.' }
          if (mem.role === 'owner') return { ok: false, error: 'The group owner cannot be removed.' }
          const leftAt = now()
          // keep history — mark inactive
          patchDb((db) => ({
            members: db.members.map((m) =>
              m.id === memberId ? { ...m, active: false, leftAt, role: 'member' as Role } : m,
            ),
          }))
          logActivity(messId, `removed ${mem.name} from the mess`, 'user-minus')
          notify({ messId, text: `${mem.name} was removed from the mess`, kind: 'member' })
          mirror(repo.updateMember(memberId, { active: false, leftAt, role: 'member' }))
          return { ok: true }
        },

        transferOwnership(memberId) {
          const messId = get().currentMessId!
          const userId = get().currentUserId
          const mess = get().db.messes.find((m) => m.id === messId)
          if (!mess || mess.ownerId !== userId) return { ok: false, error: 'Only the owner can transfer ownership.' }
          const target = get().db.members.find((m) => m.id === memberId)
          if (!target?.userId) return { ok: false, error: 'Member must have an account.' }
          const oldOwner = get().db.members.find((m) => m.messId === messId && m.role === 'owner')
          patchDb((db) => ({
            messes: db.messes.map((m) => (m.id === messId ? { ...m, ownerId: target.userId! } : m)),
            members: db.members.map((m) => {
              if (m.messId !== messId) return m
              if (m.id === memberId) return { ...m, role: 'owner' as Role }
              if (m.role === 'owner') return { ...m, role: 'member' as Role }
              return m
            }),
          }))
          logActivity(messId, `transferred ownership to ${target.name}`, 'crown')
          if (oldOwner) mirror(repo.transferOwnership(messId, target.userId, memberId, oldOwner.id))
          return { ok: true }
        },

        async leaveMess() {
          const messId = get().currentMessId
          const userId = get().currentUserId
          if (!messId || !userId) return { ok: false, error: 'Not in a mess.' }
          const mem = get().db.members.find((m) => m.messId === messId && m.userId === userId)
          if (!mem) return { ok: false, error: 'Not a member.' }
          if (mem.role === 'owner') {
            return { ok: false, error: 'Transfer ownership before leaving, or delete the mess.' }
          }
          const { error } = await repo.rpcLeaveMess(messId)
          if (error) return { ok: false, error }
          patchDb((db) => ({
            members: db.members.map((m) => (m.id === mem.id ? { ...m, active: false, leftAt: now() } : m)),
          }))
          logActivity(messId, `left the mess`, 'log-out', mem.id)
          notify({ messId, text: `${mem.name} left the mess`, kind: 'member' })
          set({ currentMessId: null })
          return { ok: true }
        },

        // ---- MEALS ----
        setMeal({ memberId, date, breakfast, lunch, dinner }) {
          const messId = requireMess()
          const clean = (n: number) => Math.max(0, Math.round(n))
          const existing = get().db.meals.find(
            (m) => m.messId === messId && m.memberId === memberId && m.date === date,
          )
          const row: Meal = existing
            ? { ...existing, breakfast: clean(breakfast), lunch: clean(lunch), dinner: clean(dinner), updatedAt: now() }
            : {
                id: uid('meal'),
                messId,
                memberId,
                date,
                breakfast: clean(breakfast),
                lunch: clean(lunch),
                dinner: clean(dinner),
                updatedAt: now(),
              }
          patchDb((db) => ({
            meals: existing ? db.meals.map((m) => (m.id === existing.id ? row : m)) : [...db.meals, row],
          }))
          mirror(repo.upsertMeal(row))
        },

        addGuestMeal({ hostMemberId, guestName, date, type, count }) {
          const messId = requireMess()
          const guest: GuestMeal = {
            id: uid('gm'),
            messId,
            hostMemberId,
            guestName: guestName.trim(),
            date,
            type,
            count: Math.max(1, Math.round(count)),
            createdAt: now(),
          }
          patchDb((db) => ({ guestMeals: [...db.guestMeals, guest] }))
          const host = get().db.members.find((m) => m.id === hostMemberId)
          logActivity(messId, `added a guest meal (${guest.guestName}) charged to ${host?.name}`, 'users', hostMemberId)
          mirror(repo.insertGuestMeal(guest))
          return { ok: true, id: guest.id }
        },

        deleteGuestMeal(id) {
          patchDb((db) => ({ guestMeals: db.guestMeals.filter((g) => g.id !== id) }))
          mirror(repo.deleteRow('guest_meals', id))
        },

        setBooking({ memberId, date, breakfast, lunch, dinner }) {
          // Local-only in Phase 1 (bookings table lands in Phase 2).
          const messId = requireMess()
          const existing = get().db.bookings.find((b) => b.messId === messId && b.memberId === memberId && b.date === date)
          if (existing) {
            patchDb((db) => ({
              bookings: db.bookings.map((b) => (b.id === existing.id ? { ...b, breakfast, lunch, dinner, updatedAt: now() } : b)),
            }))
          } else {
            patchDb((db) => ({
              bookings: [...db.bookings, { id: uid('bk'), messId, memberId, date, breakfast, lunch, dinner, updatedAt: now() }],
            }))
          }
        },

        // ---- BAZAR ----
        addBazar({ date, buyerMemberId, items, note, receipt }) {
          const messId = requireMess()
          const bazar: Bazar = {
            id: uid('baz'),
            messId,
            date,
            buyerMemberId,
            items: items.map((it) => ({ ...it, id: uid('it') })),
            note,
            receipt,
            createdAt: now(),
          }
          patchDb((db) => ({ bazars: [...db.bazars, bazar] }))
          // fold purchased quantities into inventory when names match (local-only)
          const inv = get().db.inventory.filter((i) => i.messId === messId)
          for (const it of bazar.items) {
            const match = inv.find((i) => i.name.toLowerCase() === it.name.trim().toLowerCase())
            if (match && it.qty) {
              patchDb((db) => ({
                inventory: db.inventory.map((i) => (i.id === match.id ? { ...i, stock: i.stock + it.qty!, updatedAt: now() } : i)),
              }))
            }
          }
          const total = bazar.items.reduce((s, it) => s + it.price, 0)
          const buyer = get().db.members.find((m) => m.id === buyerMemberId)
          logActivity(messId, `added a bazar expense — ৳${total.toLocaleString()}`, 'shopping-cart', buyerMemberId)
          notify({ messId, text: `${buyer?.name} added a bazar expense of ৳${total.toLocaleString()}`, kind: 'bazar' })
          mirror(repo.insertBazar(bazar))
          return { ok: true, id: bazar.id }
        },

        updateBazar(id, patch) {
          patchDb((db) => ({ bazars: db.bazars.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
          mirror(repo.updateBazar(id, patch))
        },

        deleteBazar(id) {
          patchDb((db) => ({ bazars: db.bazars.filter((b) => b.id !== id) }))
          mirror(repo.deleteRow('bazars', id))
        },

        // ---- EXPENSES ----
        addExpense(input) {
          const messId = requireMess()
          const expense: Expense = { ...input, id: uid('exp'), messId, createdAt: now() }
          patchDb((db) => ({ expenses: [...db.expenses, expense] }))
          logActivity(messId, `added ${expense.category} expense — ৳${expense.amount.toLocaleString()}`, 'receipt', expense.paidByMemberId)
          mirror(repo.insertExpense(expense))
          return { ok: true, id: expense.id }
        },

        updateExpense(id, patch) {
          patchDb((db) => ({ expenses: db.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
          mirror(repo.updateExpense(id, patch))
        },

        deleteExpense(id) {
          patchDb((db) => ({ expenses: db.expenses.filter((e) => e.id !== id) }))
          mirror(repo.deleteRow('expenses', id))
        },

        // ---- PAYMENTS ----
        addPayment({ memberId, amount, date, method, note }) {
          const messId = requireMess()
          const payment: Payment = { id: uid('pay'), messId, memberId, amount, date, method, note, createdAt: now() }
          patchDb((db) => ({ payments: [...db.payments, payment] }))
          const mem = get().db.members.find((m) => m.id === memberId)
          logActivity(messId, `paid ৳${amount.toLocaleString()} via ${method}`, 'wallet', memberId)
          notify({ messId, text: `${mem?.name} paid ৳${amount.toLocaleString()}`, kind: 'info' })
          mirror(repo.insertPayment(payment))
          return { ok: true, id: payment.id }
        },

        updatePayment(id, patch) {
          patchDb((db) => ({ payments: db.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
          mirror(repo.updatePayment(id, patch))
        },

        deletePayment(id) {
          patchDb((db) => ({ payments: db.payments.filter((p) => p.id !== id) }))
          mirror(repo.deleteRow('payments', id))
        },

        // ---- LEAVE (local-only in Phase 1) ----
        addLeave({ memberId, startDate, endDate, reason }) {
          const messId = requireMess()
          if (endDate < startDate) return { ok: false, error: 'End date must be after start date.' }
          const leave: Leave = { id: uid('lv'), messId, memberId, startDate, endDate, reason, createdAt: now() }
          patchDb((db) => ({ leaves: [...db.leaves, leave] }))
          const mem = get().db.members.find((m) => m.id === memberId)
          logActivity(messId, `scheduled leave (${startDate} → ${endDate})`, 'palmtree', memberId)
          notify({ messId, memberId, text: `Your leave starts ${startDate}`, kind: 'leave' })
          return { ok: true, id: leave.id }
        },

        deleteLeave(id) {
          patchDb((db) => ({ leaves: db.leaves.filter((l) => l.id !== id) }))
        },

        // ---- INVENTORY (local-only in Phase 1) ----
        addInventory(input) {
          const messId = requireMess()
          const item: InventoryItem = { ...input, id: uid('inv'), messId, updatedAt: now() }
          patchDb((db) => ({ inventory: [...db.inventory, item] }))
          return { ok: true, id: item.id }
        },

        updateInventory(id, patch) {
          patchDb((db) => ({ inventory: db.inventory.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)) }))
        },

        adjustStock(id, delta) {
          patchDb((db) => ({
            inventory: db.inventory.map((i) => (i.id === id ? { ...i, stock: Math.max(0, i.stock + delta), updatedAt: now() } : i)),
          }))
        },

        deleteInventory(id) {
          patchDb((db) => ({ inventory: db.inventory.filter((i) => i.id !== id) }))
        },

        // ---- SETTLEMENTS ----
        toggleSettlement({ month, fromId, toId, amount, settled }) {
          const messId = requireMess()
          const key = settleKey(month, fromId, toId)
          const existing = get().db.settlements.find(
            (s) => s.messId === messId && settleKey(s.month, s.fromMemberId, s.toMemberId) === key,
          )
          const row: Settlement = existing
            ? { ...existing, settled, amount, settledAt: settled ? now() : undefined }
            : {
                id: uid('stl'),
                messId,
                month,
                fromMemberId: fromId,
                toMemberId: toId,
                amount,
                settled,
                settledAt: settled ? now() : undefined,
              }
          patchDb((db) => ({
            settlements: existing ? db.settlements.map((s) => (s.id === existing.id ? row : s)) : [...db.settlements, row],
          }))
          if (settled) logActivity(messId, `marked a settlement as paid`, 'check-circle')
          mirror(repo.upsertSettlement(row))
        },

        // ---- NOTIFICATIONS (local-only in Phase 1) ----
        markNotifRead(id) {
          patchDb((db) => ({ notifications: db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
        },
        markAllNotifsRead() {
          const messId = get().currentMessId
          patchDb((db) => ({ notifications: db.notifications.map((n) => (n.messId === messId ? { ...n, read: true } : n)) }))
        },
        clearNotifs() {
          const messId = get().currentMessId
          patchDb((db) => ({ notifications: db.notifications.filter((n) => n.messId !== messId) }))
        },
      }
    },
    {
      // Only tiny UI prefs persist locally now; auth session + all data live in
      // Supabase. New key so any stale seeded `mess-manager-db-v1` blob is ignored.
      name: 'mess-manager-ui-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentMessId: s.currentMessId, lastContact: s.lastContact }),
    },
  ),
)
