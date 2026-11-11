import { describe, expect, it } from 'vitest'
import { etaLabel, statusLabel } from './format'

describe('statusLabel', () => {
  it('reads like a person wrote it', () => {
    expect(statusLabel('out_for_delivery')).toBe('Out for delivery')
    expect(statusLabel('exception')).toBe('Needs attention')
  })
})

describe('etaLabel', () => {
  // Naive ISO parses as local time, so these are the same in every time zone.
  const now = new Date('2026-11-12T09:00:00')

  it('counts down to the ETA (T-4527)', () => {
    expect(etaLabel('2026-11-12T09:45:00', now)).toBe('in 45 min')
    expect(etaLabel('2026-11-12T14:00:00', now)).toBe('in 5 h')
    expect(etaLabel('2026-11-15T09:00:00', now)).toBe('in 3 days')
    expect(etaLabel(null, now)).toBe('We will update you soon')
  })

  it('rounds to the nearest unit and treats a passed ETA as unknown', () => {
    expect(etaLabel('2026-11-12T14:20:00', now)).toBe('in 5 h')
    expect(etaLabel('2026-11-12T08:00:00', now)).toBe('We will update you soon')
  })
})
