import { useEffect, useRef, useState } from 'react'

// 0 -> 1 progress of a tall element passing through the viewport, driven by a
// rAF-throttled scroll listener. Used for sticky scroll-scrubbed moments.
export function useScrollProgress() {
  const ref = useRef(null)
  const [p, setP] = useState(0)
  const ticking = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      ticking.current = false
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      if (total <= 0) { setP(r.top <= 0 ? 1 : 0); return }
      setP(Math.min(Math.max(-r.top / total, 0), 1))
    }
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return [ref, p]
}
