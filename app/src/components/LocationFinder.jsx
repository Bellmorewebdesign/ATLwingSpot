import { useMemo, useState } from 'react'
import { LOCATIONS } from '../data/locations'
import { ORDER_URL } from '../data/site'
import { LocationCard } from './LocationCard'
import { Search, MapPin, ArrowUpRight } from './Icons'
import './LocationFinder.css'

// Regions are derived from the data so adding a store needs no code change.
function buildRegions() {
  const map = new Map()
  LOCATIONS.forEach((l) => map.set(l.region, (map.get(l.region) || 0) + 1))
  return [{ id: 'all', label: 'All shops', count: LOCATIONS.length },
    ...[...map].map(([label, count]) => ({ id: label, label, count }))]
}

export function LocationFinder() {
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('all')
  const regions = useMemo(buildRegions, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    return LOCATIONS.filter((l) => {
      const inRegion = region === 'all' || l.region === region
      const inSearch =
        !term ||
        [l.name, l.city, l.state, l.zip, l.street, l.region].join(' ').toLowerCase().includes(term)
      return inRegion && inSearch
    })
  }, [q, region])

  return (
    <div className="finder">
      {/* Left rail: real filters, not a decorative fake map */}
      <aside className="finder__rail">
        <div className="finder__search">
          <Search size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="City or ZIP"
            aria-label="Search locations by city or ZIP"
          />
        </div>

        <ul className="finder__regions">
          {regions.map((r) => (
            <li key={r.id}>
              <button
                className={`finder__region ${region === r.id ? 'on' : ''}`}
                aria-pressed={region === r.id}
                onClick={() => setRegion(r.id)}
              >
                <span>{r.label}</span>
                <b>{r.count}</b>
              </button>
            </li>
          ))}
        </ul>

        <a className="finder__geo" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
          <MapPin size={17} />
          <span>Use my location to order</span>
          <ArrowUpRight size={13} />
        </a>
        <p className="finder__geonote">Opens ATL&rsquo;s ordering site, which finds the shop closest to you.</p>
      </aside>

      <div className="finder__results">
        <p className="finder__count">
          {results.length} {results.length === 1 ? 'shop' : 'shops'}
          {region !== 'all' && <> in {region}</>}
        </p>
        {results.length > 0 ? (
          <ul className="finder__list">
            {results.map((l) => <LocationCard key={l.id} loc={l} />)}
          </ul>
        ) : (
          <p className="finder__empty">
            Nothing here yet. Try another city, or clear the filter to see every shop.
          </p>
        )}
      </div>
    </div>
  )
}
