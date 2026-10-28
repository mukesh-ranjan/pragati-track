import { describe, expect, it } from 'vitest'
import { statusLabel } from './format'

describe('statusLabel', () => {
  it('reads like a person wrote it', () => {
    expect(statusLabel('out_for_delivery')).toBe('Out for delivery')
    expect(statusLabel('exception')).toBe('Needs attention')
  })
})
