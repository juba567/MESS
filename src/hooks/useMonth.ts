import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { computeMonth, computeSettlement, type MonthSummary, type SettleTxn } from '@/lib/calc'
import { addMonths, currentMonth } from '@/lib/date'
import type { Month } from '@/lib/types'

/** Local month cursor with prev/next helpers. */
export function useMonthState(initial?: Month) {
  const [month, setMonth] = useState<Month>(initial ?? currentMonth())
  return {
    month,
    setMonth,
    prev: () => setMonth((m) => addMonths(m, -1)),
    next: () => setMonth((m) => addMonths(m, 1)),
    isCurrent: month === currentMonth(),
  }
}

/** Memoized monthly summary for the active mess. */
export function useMonthSummary(month: Month): MonthSummary | null {
  const db = useStore((s) => s.db)
  const messId = useStore((s) => s.currentMessId)
  return useMemo(() => (messId ? computeMonth(db, messId, month) : null), [db, messId, month])
}

export function useSettlement(summary: MonthSummary | null): SettleTxn[] {
  return useMemo(() => (summary ? computeSettlement(summary) : []), [summary])
}
