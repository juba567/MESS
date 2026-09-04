// Currency + number formatting. Default currency BDT (৳).

export function taka(n: number, opts: { decimals?: number; sign?: boolean } = {}): string {
  const { decimals = 0, sign = false } = opts
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const prefix = sign && n > 0 ? '+' : n < 0 ? '−' : ''
  return `${prefix}৳${formatted}`
}

export function money(n: number, currency = 'BDT'): string {
  const symbol = currency === 'BDT' ? '৳' : currency + ' '
  return `${symbol}${Math.round(n).toLocaleString('en-US')}`
}

export function num(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#0ea5e9,#22d3ee)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#ec4899,#f472b6)',
  'linear-gradient(135deg,#ef4444,#f87171)',
  'linear-gradient(135deg,#8b5cf6,#d946ef)',
  'linear-gradient(135deg,#14b8a6,#2dd4bf)',
]

export function avatarColor(seed?: string): string {
  if (!seed) return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/** Simple non-cryptographic hash for demo password storage. */
export function hashPassword(pw: string): string {
  let h = 5381
  for (let i = 0; i < pw.length; i++) h = (h * 33) ^ pw.charCodeAt(i)
  return 'h' + (h >>> 0).toString(36) + pw.length.toString(36)
}
