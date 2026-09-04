// Minimal CSV builder + browser download (no deps).

function esc(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

export function download(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
