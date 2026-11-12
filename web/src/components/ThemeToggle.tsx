import { useCallback, useEffect, useState } from 'react'
import { cx } from './cx'
import './ThemeToggle.css'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'pragati-theme'

/** Current theme as set on `<html data-theme>`; dark when unset. */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** Write the theme to `<html data-theme>` and remember it for the next visit. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be blocked (private mode, disabled cookies); the page still works.
  }
}

/** Restore the remembered theme, if any. Call once at startup before rendering. */
export function initTheme(): Theme {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  const theme: Theme = saved === 'light' || saved === 'dark' ? saved : getTheme()
  document.documentElement.dataset.theme = theme
  return theme
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const setTheme = useCallback((next: Theme) => {
    applyTheme(next)
    setThemeState(next)
  }, [])
  // Keep in sync when something else (another toggle, the style tile) changes the attribute.
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeState(getTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return [theme, setTheme]
}

export interface ThemeToggleProps {
  className?: string
}

/**
 * Button that flips between dark and light. Its visible text names the theme it
 * switches to, and its accessible name is "Switch to light mode" / "Switch to dark mode".
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useTheme()
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const name = `Switch to ${next} mode`
  return (
    <button
      type="button"
      className={cx('pt-theme-toggle', className)}
      aria-label={name}
      title={name}
      onClick={() => setTheme(next)}
    >
      <span className="pt-theme-toggle__icon" aria-hidden="true">
        {next === 'light' ? <SunIcon /> : <MoonIcon />}
      </span>
      <span className="pt-theme-toggle__text">{next === 'light' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
