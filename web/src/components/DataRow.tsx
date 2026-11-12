import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import './DataRow.css'

export interface DataRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Primary text on the left. */
  label: ReactNode
  /** Secondary line under the label (route, timestamp). */
  hint?: ReactNode
  /** Right-aligned value. */
  value?: ReactNode
  /** Render the value in the mono face (IDs, times, amounts). */
  mono?: boolean
  /** Slot after the value, usually a StatusPill. */
  trailing?: ReactNode
}

/** One line in a list card: label (+hint) left, value and an optional trailing slot right. */
export function DataRow({ label, hint, value, mono = false, trailing, className, ...rest }: DataRowProps) {
  return (
    <div className={cx('pt-row', className)} {...rest}>
      <div className="pt-row__main">
        <span className="pt-row__label">{label}</span>
        {hint !== undefined && <span className="pt-row__hint">{hint}</span>}
      </div>
      {value !== undefined && <span className={cx('pt-row__value', mono && 'pt-row__value--mono')}>{value}</span>}
      {trailing !== undefined && <span className="pt-row__trailing">{trailing}</span>}
    </div>
  )
}
