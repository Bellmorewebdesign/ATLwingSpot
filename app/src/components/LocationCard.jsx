import { ORDER_URL } from '../data/site'
import { mapsUrl } from '../data/locations'
import { ArrowUpRight } from './Icons'
import './LocationCard.css'

// A scannable row, not a boxed card — reads fast on a phone.
export function LocationCard({ loc }) {
  return (
    <li className="loc">
      <div className="loc__main">
        <h3 className="dsp loc__name">{loc.name}</h3>
        <address className="loc__addr">
          {loc.street}, {loc.city}, {loc.state} {loc.zip}
        </address>
        {loc.since && <span className="loc__since">{loc.since}</span>}
      </div>
      <div className="loc__acts">
        <a className="btn btn-orange btn-sm" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
          Order
        </a>
        <a className="loc__dir" href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">
          Directions <ArrowUpRight size={13} />
        </a>
      </div>
    </li>
  )
}
