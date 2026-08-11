import { Link } from 'react-router-dom'
import { ORDER_URL } from '../data/site'
import { ArrowRight, MapPin } from './Icons'
import './StickyMobileBar.css'

// Always-present ordering rail on phones. The three things a phone visitor
// wants — order, menu, locations — one thumb-reach away.
export function StickyMobileBar() {
  return (
    <div className="mobile-bar" role="navigation" aria-label="Quick actions">
      <Link to="/menu" className="mobile-bar__btn mobile-bar__btn--ghost">Menu</Link>
      <Link to="/locations" className="mobile-bar__btn mobile-bar__btn--ghost">
        <MapPin size={17} /> Locations
      </Link>
      <a
        href={ORDER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-bar__btn mobile-bar__btn--order"
      >
        Order <ArrowRight />
      </a>
    </div>
  )
}
