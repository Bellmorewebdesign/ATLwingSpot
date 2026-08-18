import { Link } from 'react-router-dom'
import { ORDER_URL } from '../data/site'
import { ArrowRight, MapPin } from './Icons'
import './StickyMobileBar.css'

// The two things a phone visitor almost always wants, one thumb away.
export function StickyMobileBar() {
  return (
    <div className="mbar" role="navigation" aria-label="Quick actions">
      <Link to="/locations" className="mbar__b mbar__b--ghost">
        <MapPin size={17} /> Locations
      </Link>
      <a
        href={ORDER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mbar__b mbar__b--order"
      >
        Order now <ArrowRight />
      </a>
    </div>
  )
}
