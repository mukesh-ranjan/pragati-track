import type { HTMLAttributes, ReactNode } from 'react'
import type { Status } from '../api'
import { cx } from './cx'
import './StatusPill.css'

/** Operational statuses shown on the control-tower screens. */
export type PillStatus = 'delivered' | 'in_transit' | 'out_for_delivery' | 'at_risk' | 'delayed' | 'exception'

export type PillTone = 'success' | 'info' | 'warning' | 'danger'

/** Each status maps onto one of the four signal hues (see docs/design/brief.md). */
export const PILL_STATUSES: Record<PillStatus, { label: string; tone: PillTone }> = {
  delivered: { label: 'Delivered', tone: 'success' },
  in_transit: { label: 'In transit', tone: 'info' },
  out_for_delivery: { label: 'Out for delivery', tone: 'info' },
  at_risk: { label: 'At risk', tone: 'warning' },
  delayed: { label: 'Delayed', tone: 'danger' },
  exception: { label: 'Exception', tone: 'danger' },
}

/** API statuses map onto the pill set; booked and picked up read as "in transit" on the tower. */
export const API_STATUS_PILL: Record<Status, PillStatus> = {
  booked: 'in_transit',
  picked_up: 'in_transit',
  in_transit: 'in_transit',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  exception: 'exception',
}

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  status: PillStatus
  /** Replace the default label, e.g. "Delayed 3 h". The colour still follows `status`. */
  children?: ReactNode
}

/** Tinted pill with matching text and a leading dot. */
export function StatusPill({ status, children, className, ...rest }: StatusPillProps) {
  const { label, tone } = PILL_STATUSES[status]
  return (
    <span className={cx('pt-pill', `pt-pill--${tone}`, className)} data-status={status} {...rest}>
      <span className="pt-pill__dot" aria-hidden="true" />
      {children ?? label}
    </span>
  )
}
