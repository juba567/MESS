// Standalone print document for the monthly report — no deps, no app CSS.
//
// Rendered into a hidden iframe so the browser's "Save as PDF" produces a typeset
// A4 sheet instead of a screenshot of the dashboard (which is what printing the
// live page gives you: sidebar, topbar, aurora blobs and gradient progress bars).
// Because the document carries its own styles, it looks identical whether the app
// is in light or dark mode.

import { num, round2 } from '@/lib/format'
import { monthLabel } from '@/lib/date'
import type { MemberMonth, MonthSummary } from '@/lib/calc'
import type { Month } from '@/lib/types'

export interface ReportDocOpts {
  messName: string
  messCode?: string
  month: Month
  summary: MonthSummary
}

// Light-theme palette (60/30/10), hardcoded rather than read from CSS variables so
// the sheet stays beige even when the app is running in dark mode.
const PAPER = '#f5ebe6' // 60% Oatmeal Beige
const INK = '#353a26' //   30% Dark Olive
const ACCENT = '#e0a96d' // 10% Mustard
const ZEBRA = '#efe3dc'
const GOOD = '#2f6b4f' // receivable — deep green, legible on beige
const BAD = '#9b2c2c' //  payable    — deep rose

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"]/g, (c) => ENTITIES[c])
}

/**
 * Integers stay clean, fractions get 2 dp — e.g. `825`, `868.42`, `43.42`.
 * Rounds first so summed floats (825 + 868.42 + … = 3300.0000000000005) don't
 * render as `3,300.00`.
 */
function n2(v: number): string {
  const r = round2(v)
  return num(r, Number.isInteger(r) ? 0 : 2)
}

const STATUS: Record<MemberMonth['status'], { letter: string; color: string }> = {
  receivable: { letter: 'R', color: GOOD },
  due: { letter: 'P', color: BAD },
  settled: { letter: '–', color: 'rgba(53,58,38,.45)' },
}

const COLS = [
  { label: 'Member', width: '21%' },
  { label: 'Lunch', width: '6.5%' },
  { label: 'Dinner', width: '6.5%' },
  { label: 'Guest', width: '6.5%' },
  { label: 'Total Meal', width: '7.5%' },
  { label: 'Meal Cost', width: '9%' },
  { label: 'Other Cost', width: '8%' },
  { label: 'Total Cost', width: '9%' },
  { label: 'Paid', width: '8.5%' },
  { label: 'Balance', width: '9%' },
  { label: 'Status', width: '8.5%' },
]

function styles(): string {
  return `
*,*::before,*::after{box-sizing:border-box}
@page{size:A4;margin:14mm}
html,body{
  margin:0;background:${PAPER};color:${INK};
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
body{
  position:relative;
  font:400 8pt/1.4 'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif;
  font-variant-numeric:tabular-nums;
}

/* Fixed in print so the frame and footer repeat on every page. */
.frame{position:fixed;inset:0;border:4px double ${INK};z-index:0}
.foot{
  position:fixed;bottom:3.5mm;left:9mm;right:9mm;z-index:2;
  display:flex;justify-content:space-between;gap:6mm;
  font-size:6.5pt;letter-spacing:.03em;color:rgba(53,58,38,.42)
}
.doc{position:relative;z-index:1;padding:12mm 9mm 15mm}

/* ---- masthead ---- */
.title{
  margin:0;text-align:center;font:700 19pt/1.1 Georgia,'Times New Roman',serif;
  text-transform:uppercase;letter-spacing:.1em
}
.title .sep{color:${ACCENT}}
.rule{height:2.2px;background:${ACCENT};margin:3.5mm auto 2mm;width:52%;border-radius:2px}
.sub{
  margin:0;text-align:center;font-size:7.5pt;letter-spacing:.11em;
  text-transform:uppercase;color:rgba(53,58,38,.62)
}

/* ---- member table ---- */
.grid{
  width:100%;border-collapse:collapse;margin-top:8mm;
  border:1.2px solid ${INK};font-size:8pt
}
.grid th,.grid td{border:1px solid rgba(53,58,38,.22);padding:4.5px 4px}
.grid thead th{
  background:${INK};color:${PAPER};border-color:rgba(245,235,230,.3);
  font:600 7pt/1.25 'Segoe UI',system-ui,sans-serif;
  text-transform:uppercase;letter-spacing:.05em;text-align:center;vertical-align:middle
}
.grid thead th:first-child{text-align:left}
.grid tbody tr:nth-child(even) td{background:${ZEBRA}}
.grid tbody tr{break-inside:avoid}
.grid .name{font-weight:600;line-height:1.25}
.grid .left{font-weight:400;font-size:6.5pt;color:rgba(53,58,38,.5)}
.grid .n{text-align:center;white-space:nowrap}
.grid .m{text-align:right;white-space:nowrap}
.grid .strong{font-weight:700}
.grid tfoot td{
  background:rgba(224,169,109,.34);font-weight:700;
  border-top:1.4px solid ${INK}
}
.pill{
  display:inline-block;min-width:14px;padding:1px 5px;border-radius:99px;
  color:${PAPER};font-weight:700;font-size:7pt;letter-spacing:.04em
}

.legend{margin:2.5mm 0 0;font-size:7pt;color:rgba(53,58,38,.7);letter-spacing:.02em}
.legend b{color:${INK}}

/* ---- summary ---- */
.sum-h{
  margin:9mm 0 3mm;font:700 12pt/1 Georgia,'Times New Roman',serif;
  text-transform:uppercase;letter-spacing:.13em
}
.sum-h::after{content:'';display:block;width:24mm;height:2px;background:${ACCENT};margin-top:1.8mm}
.sum{width:88mm;border-collapse:collapse;border:1.2px solid ${INK};font-size:8.5pt}
.sum th,.sum td{border:1px solid rgba(53,58,38,.22);padding:5px 7px}
.sum th{text-align:left;font-weight:600}
.sum td{text-align:right;font-weight:700;width:36%;white-space:nowrap}
.sum tr.hi th,.sum tr.hi td{background:rgba(224,169,109,.28)}
.sum tr.tot th,.sum tr.tot td{background:${INK};color:${PAPER};border-color:rgba(245,235,230,.3)}

/* Screen only: simulate the A4 sheet so the layout can be reviewed in a browser. */
@media screen{
  html{background:#d8d0c8;padding:10mm 0}
  body{
    width:182mm;min-height:269mm;margin:0 auto;
    outline:14mm solid ${PAPER};box-shadow:0 6px 30px rgba(0,0,0,.28)
  }
  .frame,.foot{position:absolute}
}`
}

/** Pure — returns a complete standalone HTML document for the given month. */
export function buildReportHTML({ messName, messCode, month, summary }: ReportDocOpts): string {
  const sum = (f: (m: MemberMonth) => number) => summary.members.reduce((a, m) => a + f(m), 0)

  const rows = summary.members
    .map((m) => {
      const s = STATUS[m.status]
      return `<tr>
<td class="name">${esc(m.member.name)}${m.member.active ? '' : ' <span class="left">(left)</span>'}</td>
<td class="n">${num(m.lunch)}</td>
<td class="n">${num(m.dinner)}</td>
<td class="n">${num(m.guestMeals)}</td>
<td class="n strong">${num(m.meals)}</td>
<td class="m">${n2(m.mealCost)}</td>
<td class="m">${n2(m.otherCost)}</td>
<td class="m strong">${n2(m.totalCost)}</td>
<td class="m">${n2(m.paid)}</td>
<td class="m strong">${n2(Math.abs(m.balance))}</td>
<td class="n"><span class="pill" style="background:${s.color}">${s.letter}</span></td>
</tr>`
    })
    .join('\n')

  // Only shown when meal-based expenses exist (they are 0 in most months).
  const mealExpRow =
    summary.mealExpenses > 0
      ? `<tr><th>Meal-based expenses</th><td>${n2(summary.mealExpenses)}</td></tr>`
      : ''

  // en-GB renders "Sept"; compose it so the month is always a 3-letter "Sep".
  const now = new Date()
  const generated = `${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'short' })} ${now.getFullYear()}`
  const subtitle = [messName, messCode && `Code ${messCode}`, `${summary.memberCount} members`]
    .filter(Boolean)
    .join(' · ')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>mess-report-${esc(month)}</title>
<style>${styles()}</style>
</head>
<body>
<div class="frame"></div>

<div class="doc">
  <h1 class="title">Mess Report <span class="sep">·</span> ${esc(monthLabel(month))}</h1>
  <div class="rule"></div>
  <p class="sub">${esc(subtitle)}</p>

  <table class="grid">
    <colgroup>${COLS.map((c) => `<col style="width:${c.width}" />`).join('')}</colgroup>
    <thead><tr>${COLS.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>
${rows}
    </tbody>
    <tfoot>
      <tr>
        <td>Total</td>
        <td class="n">${num(summary.lunch)}</td>
        <td class="n">${num(summary.dinner)}</td>
        <td class="n">${num(summary.guestMeals)}</td>
        <td class="n">${num(summary.totalMeals)}</td>
        <td class="m">${n2(sum((m) => m.mealCost))}</td>
        <td class="m">${n2(sum((m) => m.otherCost))}</td>
        <td class="m">${n2(summary.totalCost)}</td>
        <td class="m">${n2(summary.totalCollected)}</td>
        <td class="m"></td>
        <td class="n"></td>
      </tr>
    </tfoot>
  </table>

  <p class="legend">
    <b>*R</b> = Receivable &nbsp;&nbsp; <b>*P</b> = Payable &nbsp;&nbsp;·&nbsp;&nbsp; All amounts in BDT (৳)
  </p>

  <h2 class="sum-h">Summary</h2>
  <table class="sum">
    <tr><th>Meal rate</th><td>${n2(summary.mealRate)}</td></tr>
    <tr><th>Total bazar</th><td>${n2(summary.totalBazar)}</td></tr>
    ${mealExpRow}
    <tr><th>Other (equal) expenses</th><td>${n2(summary.otherExpenses)}</td></tr>
    <tr class="hi"><th>Total cost</th><td>${n2(summary.totalCost)}</td></tr>
    <tr class="tot"><th>Total collected</th><td>${n2(summary.totalCollected)}</td></tr>
  </table>
</div>

<footer class="foot">
  <span>${esc(messName)} · generated ${esc(generated)}</span>
  <span>This PDF is automatically generated</span>
</footer>
</body>
</html>`
}

/** Builds the document and opens the browser's print / "Save as PDF" dialog. */
export function printMonthReport(opts: ReportDocOpts): void {
  const html = buildReportHTML(opts)

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = html
  frame.onload = () => {
    const w = frame.contentWindow
    if (!w) return
    try {
      // Removing the frame before the dialog closes cancels the print, so wait for
      // afterprint; the timeout is only a safety net for browsers that never fire it.
      w.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 500), { once: true })
      setTimeout(() => frame.remove(), 10 * 60 * 1000)
      w.focus()
      w.print()
    } catch {
      frame.remove()
      openInTab(html)
    }
  }
  document.body.appendChild(frame)
}

/** Fallback for engines that refuse to print from an iframe. */
function openInTab(html: string): void {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
