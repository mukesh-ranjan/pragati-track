import type { Status } from './api'

const LABELS: Record<Status, string> = {
  booked: 'Booked',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  exception: 'Needs attention',
}

export function statusLabel(s: Status): string {
  return LABELS[s]
}

/** "₹18.40", "₹21.4" or "₹1,24,000": Indian grouping, the given number of decimals. */
export function inr(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** "1,284" with Indian grouping and no decimals. */
export function count(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

/** "94.6%" with one decimal. */
export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

/** "8 Nov, 09:15" in the viewer's time zone. */
export function shortTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "6 pm": the ETA rounded up to the hour, since "by" promises an upper bound. */
function hourLabel(d: Date): string {
  const h = Math.min(23, d.getHours() + (d.getMinutes() > 0 ? 1 : 0))
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve} ${h < 12 ? 'am' : 'pm'}`
}

/**
 * ETA in customer words (T-4527): "Arrives today by 6 pm", "Arrives tomorrow by 12 pm",
 * "Arrives Thu 14 Nov", or "We will update you soon" when the API gives no ETA.
 * `now` is injectable so tests do not depend on the clock.
 */
export function etaLabel(eta: string | null, now: Date = new Date()): string {
  if (!eta) return 'We will update you soon'
  const d = new Date(eta)
  if (sameDay(d, now)) return `Arrives today by ${hourLabel(d)}`
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (sameDay(d, tomorrow)) return `Arrives tomorrow by ${hourLabel(d)}`
  const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' })
  const month = d.toLocaleDateString('en-IN', { month: 'short' })
  return `Arrives ${weekday} ${d.getDate()} ${month}`
}
