import { ORDER_URL } from '../data/site'
import { mapsUrl } from '../data/locations'
import { MapPin, ArrowUpRight } from './Icons'
import './LocationCard.css'

export function LocationCard({ loc }) {
  return (
    <article className="loc-card">
      <div className="loc-card__top">
        <span className="loc-card__state">{loc.state}</span>
        <span className="loc-card__region">{loc.region}</span>
      </div>
      <h3 className="loc-card__name font-display">{loc.name}</h3>
      <address className="loc-card__addr">
        {loc.street}<br />
        {loc.city}, {loc.state} {loc.zip}
      </address>
      <div className="loc-card__actions">
        <a
          className="btn btn--orange btn--sm"
          href={ORDER_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Order Now
        </a>
        <a
          className="loc-card__dir link-arrow"
          href={mapsUrl(loc)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin size={16} /> Directions <ArrowUpRight size={14} />
        </a>
      </div>
    </article>
  )
}
