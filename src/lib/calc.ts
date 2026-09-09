import type {
  Bazar,
  Database,
  Expense,
  ID,
  ISODate,
  Member,
  Mess,
  Month,
  SplitMethod,
} from './types'
import { daysInMonth, eachDay, todayISO } from './date'
import { round2 } from './format'

export const FUND_ID = '__fund__'
export const FUND_NAME = 'Mess Fund'

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function bazarTotal(b: Bazar): number {
  return b.items.reduce((s, it) => s + (Number(it.price) || 0), 0)
}

export function membersOf(db: Database, messId: ID): Member[] {
  return db.members.filter((m) => m.messId === messId)
}

export function activeMembersOf(db: Database, messId: ID): Member[] {
  return db.members.filter((m) => m.messId === messId && m.active)
}

/** Members who belonged to the mess at any point during `month`. */
export function membersInMonth(db: Database, messId: ID, month: Month): Member[] {
  const start = `${month}-01`
  const end = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  return db.members.filter((m) => {
    if (m.messId !== messId) return false
    const joined = m.joinedAt.slice(0, 10)
    if (joined > end) return false
    if (!m.active && m.leftAt && m.leftAt.slice(0, 10) < start) return false
    return true
  })
}

export function effectiveSplit(mess: Mess, e: Expense): SplitMethod {
  return e.split ?? mess.settings.categorySplit[e.category] ?? 'equal'
}

/**
 * Opt-out meal model: lunch + dinner are ON by default for every day a member
 * belongs to the mess. `isMealDay` answers "could this member have a meal on
 * this date" — i.e. the date is on/after the mess start and the member's join,
 * and on/before their leave date. It does NOT cap at "today"; callers that
 * compute billable totals additionally require `date <= today`, while the
 * meal editor also shows future days so upcoming meals can be pre-cancelled.
 */
export function isMealDay(mess: Mess, member: Member, date: ISODate): boolean {
  if (date < mess.startDate) return false
  if (date < member.joinedAt.slice(0, 10)) return false
  if (!member.active && member.leftAt && date > member.leftAt.slice(0, 10)) return false
  return true
}

// ---------------------------------------------------------------------------
// Monthly computation
// ---------------------------------------------------------------------------

export interface MemberMonth {
  memberId: ID
  member: Member
  lunch: number
  dinner: number
  ownMeals: number
  guestMeals: number
  meals: number
  mealCost: number
  otherCost: number
  totalCost: number
  paid: number
  balance: number
  status: 'due' | 'receivable' | 'settled'
}

export interface MonthSummary {
  month: Month
  members: MemberMonth[]
  memberCount: number
  activeMemberCount: number
  totalMeals: number
  lunch: number
  dinner: number
  guestMeals: number
  totalBazar: number
  mealExpenses: number
  otherExpenses: number
  totalExpenses: number
  mealBasis: number
  totalCost: number
  mealRate: number
  totalCollected: number
  totalDue: number
  totalReceivable: number
}

export function computeMonth(db: Database, messId: ID, month: Month): MonthSummary {
  const mess = db.messes.find((m) => m.id === messId)!
  const members = membersInMonth(db, messId, month)
  const memberIds = new Set(members.map((m) => m.id))
  const splitCount = members.length || 1

  const inMonth = <T extends { date: string; messId: string }>(rows: T[]) =>
    rows.filter((r) => r.messId === messId && r.date.slice(0, 7) === month)

  const meals = inMonth(db.meals)
  const guests = inMonth(db.guestMeals)
  const bazars = inMonth(db.bazars)
  const expenses = inMonth(db.expenses)
  const payments = inMonth(db.payments)

  // --- meal totals (opt-out model) ---
  // A stored meal row is an OVERRIDE for that member/day: lunch/dinner 1 = eating,
  // 0 = cancelled. With no row, both default ON for every day the member belongs
  // to the mess. Only elapsed days (through today) are billable.
  const today = todayISO()
  const monthEnd = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  const countableEnd = today < monthEnd ? today : monthEnd
  const monthDays = eachDay(month)

  const overrideOf = new Map<string, { lunch: number; dinner: number }>()
  for (const m of meals) {
    if (!memberIds.has(m.memberId)) continue
    overrideOf.set(`${m.memberId}|${m.date}`, {
      lunch: m.lunch > 0 ? 1 : 0,
      dinner: m.dinner > 0 ? 1 : 0,
    })
  }

  // Per-member OWN effective lunch/dinner over billable days.
  const ownOf = new Map<ID, { lunch: number; dinner: number }>()
  let lunch = 0
  let dinner = 0
  for (const mem of members) {
    let ml = 0
    let md = 0
    for (const date of monthDays) {
      if (date > countableEnd) break // ascending — nothing billable beyond today
      if (!isMealDay(mess, mem, date)) continue
      const ov = overrideOf.get(`${mem.id}|${date}`)
      ml += ov ? ov.lunch : 1
      md += ov ? ov.dinner : 1
    }
    ownOf.set(mem.id, { lunch: ml, dinner: md })
    lunch += ml
    dinner += md
  }

  // Guest meals are explicit records charged to a host (breakfast folded into lunch).
  let guestMeals = 0
  for (const g of guests) {
    if (!memberIds.has(g.hostMemberId)) continue
    guestMeals += g.count
    if (g.type === 'dinner') dinner += g.count
    else lunch += g.count
  }
  const totalMeals = lunch + dinner

  // --- cost basis ---
  const totalBazar = bazars.reduce((s, b) => s + bazarTotal(b), 0)
  let mealExpenses = 0
  const otherExpenseRows: Expense[] = []
  for (const e of expenses) {
    if (effectiveSplit(mess, e) === 'meal') mealExpenses += e.amount
    else otherExpenseRows.push(e)
  }
  const otherExpensesTotal = otherExpenseRows.reduce((s, e) => s + e.amount, 0)
  const mealBasis = totalBazar + mealExpenses
  const mealRate = totalMeals > 0 ? mealBasis / totalMeals : 0
  const totalCost = mealBasis + otherExpensesTotal

  // --- per-member ---
  const memberMonths: MemberMonth[] = members.map((mem) => {
    const own = ownOf.get(mem.id) ?? { lunch: 0, dinner: 0 }
    const l = own.lunch
    const d = own.dinner
    let gCount = 0
    for (const g of guests) {
      if (g.hostMemberId === mem.id) gCount += g.count
    }
    const ownMeals = l + d
    const memberMeals = ownMeals + gCount
    const mealCost = memberMeals * mealRate

    // share of each non-meal expense
    let otherCost = 0
    for (const e of otherExpenseRows) {
      const split = effectiveSplit(mess, e)
      if (split === 'custom' && e.customShares && Object.keys(e.customShares).length) {
        const totalW = Object.values(e.customShares).reduce((s, w) => s + (w || 0), 0)
        const w = e.customShares[mem.id] || 0
        if (totalW > 0) otherCost += (w / totalW) * e.amount
      } else {
        otherCost += e.amount / splitCount
      }
    }

    const total = mealCost + otherCost
    const paid = payments.filter((p) => p.memberId === mem.id).reduce((s, p) => s + p.amount, 0)
    const balance = paid - total
    const status: MemberMonth['status'] =
      balance > 0.5 ? 'receivable' : balance < -0.5 ? 'due' : 'settled'

    return {
      memberId: mem.id,
      member: mem,
      lunch: l,
      dinner: d,
      ownMeals,
      guestMeals: gCount,
      meals: memberMeals,
      mealCost: round2(mealCost),
      otherCost: round2(otherCost),
      totalCost: round2(total),
      paid: round2(paid),
      balance: round2(balance),
      status,
    }
  })

  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const totalDue = memberMonths.filter((m) => m.balance < 0).reduce((s, m) => s - m.balance, 0)
  const totalReceivable = memberMonths.filter((m) => m.balance > 0).reduce((s, m) => s + m.balance, 0)

  return {
    month,
    members: memberMonths,
    memberCount: members.length,
    activeMemberCount: members.filter((m) => m.active).length,
    totalMeals,
    lunch,
    dinner,
    guestMeals,
    totalBazar: round2(totalBazar),
    mealExpenses: round2(mealExpenses),
    otherExpenses: round2(otherExpensesTotal),
    totalExpenses: round2(mealExpenses + otherExpensesTotal),
    mealBasis: round2(mealBasis),
    totalCost: round2(totalCost),
    mealRate: round2(mealRate),
    totalCollected: round2(totalCollected),
    totalDue: round2(totalDue),
    totalReceivable: round2(totalReceivable),
  }
}

// ---------------------------------------------------------------------------
// Settlement — minimal-transaction debt simplification
// ---------------------------------------------------------------------------

export interface SettleTxn {
  fromId: ID
  toId: ID
  amount: number
}

export function computeSettlement(summary: MonthSummary): SettleTxn[] {
  const eps = 0.5
  const creditors = summary.members
    .filter((m) => m.balance > eps)
    .map((m) => ({ id: m.memberId, amt: m.balance }))
  const debtors = summary.members
    .filter((m) => m.balance < -eps)
    .map((m) => ({ id: m.memberId, amt: -m.balance }))

  const totalCredit = creditors.reduce((s, c) => s + c.amt, 0)
  const totalDebt = debtors.reduce((s, d) => s + d.amt, 0)

  // Balance the two sides against the mess fund when collections ≠ cost.
  if (totalDebt - totalCredit > eps) creditors.push({ id: FUND_ID, amt: totalDebt - totalCredit })
  else if (totalCredit - totalDebt > eps) debtors.push({ id: FUND_ID, amt: totalCredit - totalDebt })

  creditors.sort((a, b) => b.amt - a.amt)
  debtors.sort((a, b) => b.amt - a.amt)

  const txns: SettleTxn[] = []
  let i = 0
  let j = 0
  let guard = 0
  while (i < creditors.length && j < debtors.length && guard < 10000) {
    guard++
    const c = creditors[i]
    const d = debtors[j]
    const pay = Math.min(c.amt, d.amt)
    if (pay > eps) txns.push({ fromId: d.id, toId: c.id, amount: round2(pay) })
    c.amt -= pay
    d.amt -= pay
    if (c.amt <= eps) i++
    if (d.amt <= eps) j++
  }
  return txns
}

export function settleKey(month: Month, fromId: ID, toId: ID): string {
  return `${month}|${fromId}|${toId}`
}
