import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import './Card.css'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Card heading, shown left in the header line. */
  title?: ReactNode
  /** Context text shown right of the title (count, time range, "LIVE"). */
  meta?: ReactNode
  /** Remove the body padding so rows or charts can run edge to edge. */
  flush?: boolean
  children?: ReactNode
}

/** Raised surface with a 1 px border, large radius and the soft card shadow. */
export function Card({ title, meta, flush = false, className, children, ...rest }: CardProps) {
  const hasHeader = title !== undefined || meta !== undefined
  return (
    <section className={cx('pt-card', flush && 'pt-card--flush', className)} {...rest}>
      {hasHeader && (
        <header className="pt-card__header">
          {title !== undefined && <h3 className="pt-card__title">{title}</h3>}
          {meta !== undefined && <span className="pt-card__meta">{meta}</span>}
        </header>
      )}
      <div className="pt-card__body">{children}</div>
    </section>
  )
}
