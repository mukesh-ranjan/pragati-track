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
