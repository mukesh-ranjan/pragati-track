import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeToggle, initTheme } from './ThemeToggle'

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark'
  localStorage.clear()
})
afterEach(cleanup)

describe('ThemeToggle', () => {
  it('is a button with an accessible name that says what it will do', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: 'Switch to light mode' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
  })

  it('flips the theme on <html data-theme> and renames itself', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(document.documentElement.dataset.theme).toBe('light')

    const back = screen.getByRole('button', { name: 'Switch to dark mode' })
    fireEvent.click(back)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
  })

  it('starts from whatever theme the document already has', () => {
    document.documentElement.dataset.theme = 'light'
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeTruthy()
  })

  it('remembers the choice so initTheme restores it on the next visit', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(localStorage.getItem('pragati-theme')).toBe('light')

    document.documentElement.dataset.theme = 'dark'
    expect(initTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
