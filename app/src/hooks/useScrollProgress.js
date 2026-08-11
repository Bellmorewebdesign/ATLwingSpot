import { useEffect, useRef, useState } from 'react'

// Returns 0..1 progress of a tall element through the viewport, driven by a
// rAF-throttled scroll listener. Used for sticky scroll-storytelling stages
// (the CRISPY/SAUCY/SWEET interlude, the Our Story spine) without pinning.
export function useScrollProgress() {
  const ref = useRef(null)
  const [progress, setProgress] = useState(0)
  const ticking = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const compute = () => {
      ticking.current = false
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // total scrollable distance where the sticky child is on screen
      const total = rect.height - vh
      if (total <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0)
        return
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total)
      setProgress(scrolled / total)
    }

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return [ref, progress]
}
