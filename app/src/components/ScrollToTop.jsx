import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Reset scroll on navigation (HashRouter doesn't do this for us).
//
// 'instant', not 'auto'. Under 'auto' this inherits scroll-behavior from
// base.css, which is smooth, so leaving the bottom of the menu for Locations
// spent a second and a half visibly flying back up through the page you had
// already left. Smooth is right for a jump within a page, where the travel
// shows you how far you moved; it is wrong for a new page, which should simply
// be at its top when it arrives.
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}
