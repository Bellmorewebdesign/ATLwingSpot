import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Reset scroll on navigation, or go to the anchor if the URL has one.
//
// 'instant', not 'auto'. Under 'auto' this inherits scroll-behavior from
// base.css, which is smooth, so leaving the bottom of the menu for Locations
// spent a second and a half visibly flying back up through the page you had
// already left. Smooth is right for a jump within a page, where the travel
// shows you how far you moved; it is wrong for a new page, which should simply
// be at its top when it arrives.
//
// An ordinary anchor (/franchise/#fn-1) is honored: on a fresh load the
// browser looks for the element before React has drawn it, so look again once
// the page has rendered.
//
// Only page changes run this. Clicking an anchor within a page is left to the
// browser, which scrolls there itself.
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    const { hash } = window.location
    if (hash && hash.length > 1) {
      const id = decodeURIComponent(hash.slice(1))
      const frame = requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'instant' })
        else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      })
      return () => cancelAnimationFrame(frame)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}
