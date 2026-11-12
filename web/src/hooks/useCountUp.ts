import { useEffect, useState } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
}

/** Ease-out cubic: fast start, settles gently on the final value. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Animates from 0 to `target` over `duration` ms and returns the current value.
 * Jumps straight to the target when the user prefers reduced motion or the
 * browser has no requestAnimationFrame (tests).
 */
export function useCountUp(target: number, duration = 900): number {
  const skip = prefersReducedMotion() || typeof requestAnimationFrame !== 'function'
  const [value, setValue] = useState(skip ? target : 0)

  useEffect(() => {
    if (skip) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const from = 0
    // Read the same clock as `start`: the timestamp rAF passes in can be a different clock in jsdom.
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration)
      setValue(from + (target - from) * easeOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, skip])

  return value
}
