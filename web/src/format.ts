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

/** "8 Nov, 09:15" in the viewer's time zone. */
export function shortTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * ETA as a countdown from now (T-4527): "in 45 min", "in 5 h", "in 3 days",
 * or "We will update you soon" when there is no ETA or it has already passed.
 */
export function etaLabel(eta: string | null, now: Date = new Date()): string {
  if (!eta) return 'We will update you soon'
  const d = new Date(eta)
  if (Number.isNaN(d.getTime()) || d < now) return 'We will update you soon'

  const minutes = Math.round((d.getTime() - now.getTime()) / 60_000)
  if (minutes < 60) return `in ${Math.max(minutes, 1)} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `in ${hours} h`
  return `in ${Math.round(hours / 24)} days`
}
