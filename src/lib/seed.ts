import type {
  Bazar,
  BazarItem,
  Database,
  Expense,
  GuestMeal,
  InventoryItem,
  Leave,
  Meal,
  MealBooking,
  Member,
  Mess,
  Notification,
  Payment,
  User,
} from './types'
import { EMPTY_DB } from './types'
import { uid, inviteCode } from './id'
import { avatarColor, hashPassword } from './format'
import { DEFAULT_MESS_SETTINGS } from './permissions'

const MONTH = '2026-08'
const DEMO_PW = hashPassword('demo1234')

const day = (d: number) => `${MONTH}-${String(d).padStart(2, '0')}`

// Build the "Green View Mess" demo dataset on first load.
export function buildSeed(): Database {
  const db: Database = JSON.parse(JSON.stringify(EMPTY_DB))
  const ts = new Date('2026-08-01T09:00:00').toISOString()

  const people = [
    { name: 'Rahim Uddin', contact: 'rahim@demo.com', role: 'owner' as const },
    { name: 'Karim Ahmed', contact: 'karim@demo.com', role: 'manager' as const },
    { name: 'Hasan Ali', contact: 'hasan@demo.com', role: 'member' as const },
    { name: 'Sabuj Mia', contact: 'sabuj@demo.com', role: 'member' as const },
    { name: 'Jamal Hossain', contact: 'jamal@demo.com', role: 'member' as const },
    { name: 'Naim Islam', contact: 'naim@demo.com', role: 'member' as const },
  ]

  const messId = uid('mess')
  const users: User[] = []
  const members: Member[] = []

  people.forEach((p) => {
    const color = avatarColor(p.name)
    const user: User = {
      id: uid('usr'),
      fullName: p.name,
      contact: p.contact,
      passwordHash: DEMO_PW,
      avatarColor: color,
      createdAt: ts,
      notifPrefs: { mealReminder: true, dueReminder: true, bookingReminder: true, activity: true },
    }
    users.push(user)
    members.push({
      id: uid('mem'),
      messId,
      userId: user.id,
      name: p.name,
      contact: p.contact,
      role: p.role,
      active: true,
      joinedAt: ts,
      avatarColor: color,
    })
  })

  const owner = members[0]
  const mess: Mess = {
    id: messId,
    name: 'Green View Mess',
    maxMembers: 6,
    address: 'House 42, Road 7, Dhanmondi, Dhaka',
    startDate: '2026-08-01',
    currency: 'BDT',
    code: inviteCode('Green View'),
    ownerId: owner.userId!,
    createdAt: ts,
    settings: JSON.parse(JSON.stringify(DEFAULT_MESS_SETTINGS)),
  }

  db.users = users
  db.messes = [mess]
  db.members = members

  // --- leaves (one past, one upcoming) ---
  const jamal = members[4]
  const rahim = members[0]
  const leaves: Leave[] = [
    { id: uid('lv'), messId, memberId: jamal.id, startDate: day(20), endDate: day(24), reason: 'Family visit', createdAt: ts },
    { id: uid('lv'), messId, memberId: rahim.id, startDate: '2026-09-05', endDate: '2026-09-10', reason: 'Hometown trip', createdAt: ts },
  ]
  db.leaves = leaves

  const onLeave = (memberId: string, d: string) =>
    leaves.some((l) => l.memberId === memberId && d >= l.startDate && d <= l.endDate)

  // --- meals across the month ---
  const meals: Meal[] = []
  const rnd = mulberry32(20260801)
  for (const m of members) {
    for (let d = 1; d <= 31; d++) {
      const date = day(d)
      if (onLeave(m.id, date)) continue
      const b = rnd() < 0.6 ? 1 : 0
      const l = rnd() < 0.92 ? (rnd() < 0.08 ? 2 : 1) : 0
      const dn = rnd() < 0.9 ? (rnd() < 0.06 ? 2 : 1) : 0
      if (b + l + dn === 0) continue
      meals.push({ id: uid('meal'), messId, memberId: m.id, date, lunch: l, dinner: dn, updatedAt: ts })
    }
  }
  db.meals = meals

  // --- guest meals ---
  const guests: GuestMeal[] = [
    { id: uid('gm'), messId, hostMemberId: members[0].id, guestName: 'Sakib (friend)', date: day(15), type: 'lunch', count: 1, createdAt: ts },
    { id: uid('gm'), messId, hostMemberId: members[1].id, guestName: 'Tanvir (cousin)', date: day(22), type: 'dinner', count: 2, createdAt: ts },
  ]
  db.guestMeals = guests

  // --- bazar ---
  const bz = (d: number, buyerIdx: number, items: Omit<BazarItem, 'id'>[], note?: string): Bazar => ({
    id: uid('baz'),
    messId,
    date: day(d),
    buyerMemberId: members[buyerIdx].id,
    items: items.map((it) => ({ ...it, id: uid('it') })),
    note,
    createdAt: ts,
  })
  db.bazars = [
    bz(2, 0, [
      { name: 'Rice', category: 'Rice', qty: 5, unit: 'kg', price: 350 },
      { name: 'Chicken', category: 'Meat', qty: 2, unit: 'kg', price: 400 },
      { name: 'Vegetables', category: 'Vegetables', price: 150 },
    ]),
    bz(5, 1, [
      { name: 'Fish (Rui)', category: 'Fish', qty: 1.5, unit: 'kg', price: 600 },
      { name: 'Oil', category: 'Oil', qty: 2, unit: 'L', price: 360 },
      { name: 'Onion', category: 'Vegetables', qty: 2, unit: 'kg', price: 140 },
    ]),
    bz(8, 2, [
      { name: 'Rice', category: 'Rice', qty: 10, unit: 'kg', price: 700 },
      { name: 'Potato', category: 'Vegetables', qty: 3, unit: 'kg', price: 120 },
      { name: 'Egg', category: 'Grocery', qty: 30, unit: 'pcs', price: 360 },
    ]),
    bz(11, 3, [
      { name: 'Chicken', category: 'Meat', qty: 3, unit: 'kg', price: 600 },
      { name: 'Spices', category: 'Spices', price: 250 },
      { name: 'Vegetables', category: 'Vegetables', price: 300 },
    ]),
    bz(12, 5, [
      { name: 'Rice', category: 'Rice', qty: 10, unit: 'kg', price: 720 },
      { name: 'Chicken', category: 'Meat', qty: 3, unit: 'kg', price: 620 },
      { name: 'Vegetables', category: 'Vegetables', price: 300 },
    ]),
    bz(14, 4, [
      { name: 'Beef', category: 'Meat', qty: 2, unit: 'kg', price: 1600 },
      { name: 'Rice', category: 'Rice', qty: 5, unit: 'kg', price: 350 },
    ]),
    bz(17, 5, [
      { name: 'Fish (Ilish)', category: 'Fish', qty: 2, unit: 'kg', price: 800 },
      { name: 'Vegetables', category: 'Vegetables', price: 250 },
      { name: 'Oil', category: 'Oil', qty: 1, unit: 'L', price: 180 },
    ]),
    bz(20, 0, [
      { name: 'Rice', category: 'Rice', qty: 10, unit: 'kg', price: 700 },
      { name: 'Dal', category: 'Grocery', qty: 2, unit: 'kg', price: 220 },
      { name: 'Onion', category: 'Vegetables', qty: 3, unit: 'kg', price: 210 },
    ]),
    bz(23, 1, [
      { name: 'Chicken', category: 'Meat', qty: 3, unit: 'kg', price: 620 },
      { name: 'Vegetables', category: 'Vegetables', price: 300 },
      { name: 'Spices', category: 'Spices', price: 200 },
    ]),
    bz(26, 2, [
      { name: 'Fish (Rui)', category: 'Fish', qty: 2.5, unit: 'kg', price: 1000 },
      { name: 'Potato', category: 'Vegetables', qty: 5, unit: 'kg', price: 200 },
      { name: 'Oil', category: 'Oil', qty: 2, unit: 'L', price: 360 },
    ]),
    bz(29, 3, [
      { name: 'Beef', category: 'Meat', qty: 2, unit: 'kg', price: 1600 },
      { name: 'Rice', category: 'Rice', qty: 5, unit: 'kg', price: 350 },
      { name: 'Vegetables', category: 'Vegetables', price: 250 },
    ]),
    bz(30, 4, [
      { name: 'Chicken', category: 'Meat', qty: 2, unit: 'kg', price: 420 },
      { name: 'Drinks', category: 'Drinks', price: 200 },
      { name: 'Salt & Sugar', category: 'Grocery', price: 300 },
    ]),
  ]

  // --- common expenses ---
  const ex = (
    d: number,
    category: Expense['category'],
    amount: number,
    paidByIdx: number,
    description?: string,
    split?: Expense['split'],
  ): Expense => ({
    id: uid('exp'),
    messId,
    date: day(d),
    category,
    amount,
    paidByMemberId: members[paidByIdx].id,
    description,
    split,
    createdAt: ts,
  })
  db.expenses = [
    ex(2, 'Gas', 1200, 1, 'Monthly gas bill'),
    ex(3, 'Maid', 1000, 0, 'Cook & cleaning helper'),
    ex(5, 'Electricity', 900, 0, 'DESCO bill'),
    ex(5, 'WiFi', 800, 1, 'Broadband — 20 Mbps'),
    ex(5, 'Water', 300, 2),
    ex(10, 'Cleaning', 200, 3, 'Supplies'),
  ]

  // --- payments ---
  const pay = (memberIdx: number, amount: number, d: number, method: Payment['method']): Payment => ({
    id: uid('pay'),
    messId,
    memberId: members[memberIdx].id,
    amount,
    date: day(d),
    method,
    createdAt: ts,
  })
  db.payments = [
    pay(0, 3000, 3, 'bKash'),
    pay(1, 2000, 4, 'Cash'),
    pay(2, 2500, 6, 'Nagad'),
    pay(3, 3000, 5, 'bKash'),
    pay(4, 1500, 8, 'Cash'),
    pay(5, 2800, 7, 'Bank'),
  ]

  // --- inventory ---
  const inv = (name: string, unit: string, stock: number, low: number): InventoryItem => ({
    id: uid('inv'),
    messId,
    name,
    unit,
    stock,
    lowThreshold: low,
    updatedAt: ts,
  })
  db.inventory = [
    inv('Rice', 'kg', 7, 5),
    inv('Oil', 'L', 1, 2),
    inv('Dal', 'kg', 3, 2),
    inv('Salt', 'kg', 2, 1),
    inv('Onion', 'kg', 4, 3),
    inv('Potato', 'kg', 6, 3),
    inv('Spices', 'box', 2, 1),
  ]

  // --- tomorrow's bookings (Sept 1) ---
  const tomorrow = '2026-09-01'
  const bookings: MealBooking[] = [
    { id: uid('bk'), messId, memberId: members[0].id, date: tomorrow, breakfast: true, lunch: true, dinner: false, updatedAt: ts },
    { id: uid('bk'), messId, memberId: members[1].id, date: tomorrow, breakfast: false, lunch: true, dinner: true, updatedAt: ts },
    { id: uid('bk'), messId, memberId: members[2].id, date: tomorrow, breakfast: true, lunch: true, dinner: true, updatedAt: ts },
    { id: uid('bk'), messId, memberId: members[3].id, date: tomorrow, breakfast: false, lunch: true, dinner: true, updatedAt: ts },
    { id: uid('bk'), messId, memberId: members[5].id, date: tomorrow, breakfast: true, lunch: false, dinner: true, updatedAt: ts },
  ]
  db.bookings = bookings

  // --- notifications ---
  const notif = (text: string, kind: Notification['kind'], read = false, memberId?: string): Notification => ({
    id: uid('ntf'),
    messId,
    memberId,
    text,
    kind,
    read,
    createdAt: ts,
  })
  db.notifications = [
    notif("You haven't entered today's meal yet.", 'meal'),
    notif("Tomorrow's meal booking closes at 9:00 PM.", 'booking'),
    notif('Oil is running low (1 L left).', 'info'),
    notif('Monthly settlement is pending.', 'settlement'),
    notif('Naim Islam added a bazar expense of ৳920.', 'bazar', true),
  ]

  // --- activity log ---
  db.activities = [
    { id: uid('act'), messId, actorMemberId: members[4].id, actorName: members[4].name, text: 'added a bazar expense — ৳920', icon: 'shopping-cart', createdAt: ts },
    { id: uid('act'), messId, actorMemberId: members[3].id, actorName: members[3].name, text: 'added a bazar expense — ৳2,200', icon: 'shopping-cart', createdAt: ts },
    { id: uid('act'), messId, actorMemberId: members[1].id, actorName: members[1].name, text: 'added Cleaning expense — ৳200', icon: 'receipt', createdAt: ts },
    { id: uid('act'), messId, actorMemberId: members[5].id, actorName: members[5].name, text: 'paid ৳2,800 via Bank', icon: 'wallet', createdAt: ts },
    { id: uid('act'), messId, actorMemberId: members[0].id, actorName: members[0].name, text: 'created the mess “Green View Mess”', icon: 'sparkles', createdAt: ts },
  ]

  return db
}

// tiny seeded PRNG for stable-ish demo meals
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
