import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

// Animates a number from 0 -> target once `active` becomes true.
// Snaps straight to target when reduced motion is requested.
export function useCountUp(target, active, { duration = 1400 } = {}) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!active) return
    if (reduced) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, active, duration, reduced])

  return value
}
