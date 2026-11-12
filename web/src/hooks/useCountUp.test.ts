import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { useCountUp } from './useCountUp'

function mockMatchMedia(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

afterEach(() => {
  // Vitest runs without globals, so Testing Library does not auto-unmount. Without this a late
  // animation frame re-renders the hook after matchMedia is restored and throws (flaky suite).
  cleanup()
  vi.restoreAllMocks()
})

describe('useCountUp', () => {
  it('jumps straight to the target when the user prefers reduced motion', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useCountUp(1284))
    expect(result.current).toBe(1284)
  })

  it('starts at zero and settles on the target otherwise', async () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useCountUp(37, 50))
    expect(result.current).toBe(0)
    await waitFor(() => expect(result.current).toBe(37))
  })
})
