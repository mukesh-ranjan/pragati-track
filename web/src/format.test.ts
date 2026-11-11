import { describe, expect, it } from 'vitest'
import { etaLabel, statusLabel } from './format'

describe('statusLabel', () => {
  it('reads like a person wrote it', () => {
    expect(statusLabel('out_for_delivery')).toBe('Out for delivery')
    expect(statusLabel('exception')).toBe('Needs attention')
  })
})

describe('etaLabel', () => {
  // Naive ISO parses as local time, so these strings are the same in every time zone.
  const now = new Date('2024-11-12T09:00:00') // a Tuesday

  it('speaks in customer words (T-4527)', () => {
    expect(etaLabel('2024-11-12T18:00:00', now)).toBe('Arrives today by 6 pm')
    expect(etaLabel('2024-11-13T12:00:00', now)).toBe('Arrives tomorrow by 12 pm')
    expect(etaLabel('2024-11-14T10:00:00', now)).toBe('Arrives Thu 14 Nov')
    expect(etaLabel(null, now)).toBe('We will update you soon')
  })
})
