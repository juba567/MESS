// Lightweight id + invite-code generation (no external deps).

let counter = 0

export function uid(prefix = ''): string {
  counter = (counter + 1) % 100000
  const rand = Math.random().toString(36).slice(2, 8)
  const time = Date.now().toString(36)
  return `${prefix}${prefix ? '_' : ''}${time}${counter.toString(36)}${rand}`
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I

/** Human-friendly invite code, e.g. GM6X92 */
export function inviteCode(seed?: string): string {
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  // seed lets us bias the first two letters toward mess initials (optional)
  if (seed) {
    const letters = seed.replace(/[^a-zA-Z]/g, '').toUpperCase()
    if (letters.length >= 2) out = letters.slice(0, 2) + out.slice(2)
  }
  return out
}
