import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { ID, Member } from '@/lib/types'
import { can, type Capability } from '@/lib/permissions'

/** The signed-in user record. */
export function useUser() {
  return useStore((s) => (s.currentUserId ? s.db.users.find((u) => u.id === s.currentUserId) ?? null : null))
}

/** The active mess. */
export function useMess() {
  const messId = useStore((s) => s.currentMessId)
  return useStore((s) => (messId ? s.db.messes.find((m) => m.id === messId) ?? null : null))
}

/** The current user's membership in the active mess. */
export function useCurrentMember(): Member | null {
  const messId = useStore((s) => s.currentMessId)
  const userId = useStore((s) => s.currentUserId)
  return useStore(
    (s) => (messId && userId ? s.db.members.find((m) => m.messId === messId && m.userId === userId) ?? null : null),
  )
}

/** All members of the active mess (owner first, active before inactive). */
export function useMembers(): Member[] {
  const messId = useStore((s) => s.currentMessId)
  const members = useStore((s) => s.db.members)
  return useMemo(() => {
    const roleRank = { owner: 0, manager: 1, member: 2 }
    return members
      .filter((m) => m.messId === messId)
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        if (roleRank[a.role] !== roleRank[b.role]) return roleRank[a.role] - roleRank[b.role]
        return a.name.localeCompare(b.name)
      })
  }, [members, messId])
}

export function useActiveMembers(): Member[] {
  return useMembers().filter((m) => m.active)
}

export function useCan() {
  const member = useCurrentMember()
  const mess = useMess()
  return (cap: Capability) => can(member?.role, cap, mess?.settings.managerCanTransfer)
}

export function memberById(members: Member[], id?: ID): Member | undefined {
  return id ? members.find((m) => m.id === id) : undefined
}
