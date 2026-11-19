import { Link, useLocation } from 'react-router-dom'
import { ORDER_URL, ORDER_LABEL } from '../data/site'
import { findLocationBySlug, shopOrderUrl } from '../data/locations'
import { ArrowRight, MapPin } from './Icons'
import './StickyMobileBar.css'

const SHOP_PATH = /^\/locations\/([a-z0-9-]+)\/?$/

// The two things a phone visitor almost always wants, one thumb away.
//
// On a shop's own page (/locations/<shop>-<state>/) they become that shop's:
// Call its number, and Order Now straight to its menu (its own Snackpass page
// once data/locations.js has its orderUrl; the brand page until then). A
// temporarily closed shop keeps the usual bar, which points elsewhere.
export function StickyMobileBar() {
  const { pathname } = useLocation()
  const m = pathname.match(SHOP_PATH)
  const shop = m && findLocationBySlug(m[1])

  if (shop && !shop.tempClosed) {
    const tel = shop.phone ? `tel:${String(shop.phone).replace(/\D/g, '')}` : null
    return (
      <div className="mbar" role="navigation" aria-label={`Quick actions for ATL Wing Spot ${shop.name}`}>
        {tel ? (
          <a href={tel} className="mbar__b mbar__b--ghost" aria-label={`Call ATL Wing Spot ${shop.name}`}>Call</a>
        ) : (
          <Link to="/locations/" className="mbar__b mbar__b--ghost">
            <MapPin size={17} /> Locations
          </Link>
        )}
        <a
          href={shopOrderUrl(shop)}
          target="_blank"
          rel="noopener noreferrer"
          className="mbar__b mbar__b--order"
        >
          {ORDER_LABEL} <ArrowRight />
        </a>
      </div>
    )
  }

  return (
    <div className="mbar" role="navigation" aria-label="Quick actions">
      <Link to="/locations/" className="mbar__b mbar__b--ghost">
        <MapPin size={17} /> Locations
      </Link>
      <a
        href={ORDER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mbar__b mbar__b--order"
      >
        {ORDER_LABEL} <ArrowRight />
      </a>
    </div>
  )
}
