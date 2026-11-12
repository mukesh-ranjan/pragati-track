import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cx } from './cx'
import './Sidebar.css'

export interface SidebarItem {
  label: string
  /** Route for the link. Items without one render as disabled placeholders. */
  to?: string
}

export interface SidebarProps {
  items: SidebarItem[]
  /** Small block at the bottom (network summary). */
  footer?: ReactNode
  className?: string
}

/** Fixed left rail: brand, navigation, footer. The active route gets the saffron indicator. */
export function Sidebar({ items, footer, className }: SidebarProps) {
  return (
    <aside className={cx('pt-sidebar', className)}>
      <div className="pt-sidebar__brand">
        <span className="pt-sidebar__logo" aria-hidden="true">P</span>
        <span className="pt-sidebar__brand-text">
          <strong>Pragati Track</strong>
          <span>Control tower</span>
        </span>
      </div>
      <nav className="pt-sidebar__nav" aria-label="Main">
        <ul>
          {items.map(item => (
            <li key={item.label}>
              {item.to ? (
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cx('pt-sidebar__link', isActive && 'pt-sidebar__link--active')}
                >
                  <span className="pt-sidebar__box" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ) : (
                <span className="pt-sidebar__link pt-sidebar__link--soon" aria-disabled="true">
                  <span className="pt-sidebar__box" aria-hidden="true" />
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {footer !== undefined && <div className="pt-sidebar__footer">{footer}</div>}
    </aside>
  )
}
