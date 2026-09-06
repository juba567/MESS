// Supabase Realtime subscription for the active mess. Listens for INSERTs on
// the shared data tables and hands each new row to the store, which merges it
// into the local cache (live sync) and raises a notification when a *teammate*
// adds something. One channel at a time — switching messes swaps it.
//
// Requires the tables to be in the `supabase_realtime` publication (see
// supabase/schema.sql). If they are not, subscribe() simply never delivers
// events and the app keeps working (data still syncs on reload).
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type RealtimeTable = 'bazars' | 'expenses' | 'payments' | 'meals' | 'guest_meals'

const TABLES: RealtimeTable[] = ['bazars', 'expenses', 'payments', 'meals', 'guest_meals']

let channel: RealtimeChannel | null = null
let channelMessId: string | null = null

export type OnInsert = (table: RealtimeTable, row: Record<string, any>) => void

/** (Re)subscribe to INSERTs for one mess. No-op if already subscribed to it. */
export function startMessRealtime(messId: string, onInsert: OnInsert): void {
  if (channel && channelMessId === messId) return
  stopMessRealtime()
  channelMessId = messId
  const ch = supabase.channel(`mess-${messId}`)
  for (const table of TABLES) {
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table, filter: `mess_id=eq.${messId}` },
      (payload) => onInsert(table, payload.new as Record<string, any>),
    )
  }
  ch.subscribe()
  channel = ch
}

/** Tear down the active channel (on logout / leaving / switching to no mess). */
export function stopMessRealtime(): void {
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
  channelMessId = null
}
