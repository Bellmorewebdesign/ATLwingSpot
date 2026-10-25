import { useId, useMemo, useRef, useState } from 'react'
import { LOCATIONS, findByZip, approxMiles } from '../data/locations'
import { ORDER_URL } from '../data/site'
import { LocationCard } from './LocationCard'
import { Search, Close, MapPin, ArrowUpRight } from './Icons'
import './LocationFinder.css'

// Regions are derived from the data so adding a store needs no code change.
function buildRegions() {
  return [{ id: 'all', label: 'All shops' },
    ...[...new Set(LOCATIONS.map((l) => l.region))].map((label) => ({ id: label, label }))]
}

// A whole ZIP, or ZIP+4 ("11710-1234"), goes to the nearest-shop lookup.
const ZIP = /^(\d{5})(?:-?\d{4})?$/

/**
 * One search box for the whole locations page.
 *
 * It used to sit under a separate ZIP lookup, and the two did different jobs
 * with nothing to tell them apart: this one was a plain text filter, so a ZIP
 * typed here (11710, say) matched no shop's address and showed "0 shops" even
 * though the lookup above it would have found the closest one. Now the one
 * field reads what it is given:
 *
 *   a five-digit ZIP  -> the closest shops to it, nearest first (findByZip)
 *   any other text    -> shops whose name, town, street or region match
 *   a partial ZIP     -> nothing filtered yet, and a nudge to finish it
 *
 * A search always looks across every shop, and picking a region clears the
 * search, the same way the menu page's search and categories work. So the two
 * can never narrow each other down to nothing.
 */
export function LocationFinder() {
  const id = useId()
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('all')
  const regions = useMemo(buildRegions, [])

  const term = q.trim()
  const searching = term.length > 0

  const search = useMemo(() => {
    if (!term) return null
    const zip = term.match(ZIP)
    if (zip) return { kind: 'zip', ...findByZip(zip[1]) }
    if (/^[\d-]+$/.test(term)) return { kind: 'partial' }
    const t = term.toLowerCase()
    return {
      kind: 'text',
      shops: LOCATIONS.filter((l) =>
        [l.name, l.city, l.state, l.zip, l.street, l.region].join(' ').toLowerCase().includes(t)
      ),
    }
  }, [term])

  const results = !search || search.kind === 'partial'
    ? LOCATIONS.filter((l) => region === 'all' || l.region === region)
    : search.shops

  const onType = (e) => {
    setQ(e.target.value)
    setRegion('all')
  }
  const pickRegion = (next) => {
    setRegion(next)
    setQ('')
  }
  const showAll = () => {
    setQ('')
    setRegion('all')
  }

  const plural = (n) => `${n} ${n === 1 ? 'shop' : 'shops'}`
  let summary
  if (!search || search.kind === 'partial') {
    summary = <>{plural(results.length)}{region !== 'all' && <> in {region}</>}</>
  } else if (search.kind === 'text') {
    summary = `${plural(results.length)} matching “${term}”`
  } else if (search.status === 'exact') {
    summary = `We are in ${search.zip}`
  } else if (search.status === 'near') {
    summary = `Closest to ${search.zip}`
  } else if (search.status === 'far') {
    // miles is 0 when the area is too spread out for one number to be true of
    // all of it, so the distance is left off (same rule as the ZipLookup)
    summary = search.miles
      ? `Nearest to ${search.zip}, about ${approxMiles(search.miles)} miles out`
      : `Nearest to ${search.zip}`
  } else {
    summary = `No match for ${search.zip}`
  }

  return (
    <div className="finder">
      {/* Left rail: real filters, not a decorative fake map */}
      <aside className="finder__rail">
        <form
          role="search"
          className="finder__form"
          onSubmit={(e) => {
            e.preventDefault()
            // the results are already showing; this just puts a phone keyboard away
            inputRef.current?.blur()
          }}
        >
          <label className="finder__label" htmlFor={`${id}-q`}>Find your closest shop</label>
          <div className="finder__search">
            <Search size={18} />
            <input
              id={`${id}-q`}
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="postal-code"
              value={q}
              onChange={onType}
              placeholder="ZIP code or city"
            />
            {q && (
              <button
                type="button"
                className="finder__clear"
                aria-label="Clear search"
                onClick={() => {
                  showAll()
                  inputRef.current?.focus()
                }}
              >
                <Close size={16} />
              </button>
            )}
          </div>
          {search?.kind === 'partial' && (
            <p className="finder__hint">A ZIP code is five digits. Keep going.</p>
          )}
        </form>

        <ul className="finder__regions">
          {regions.map((r) => (
            <li key={r.id}>
              <button
                className={`finder__region ${region === r.id && !searching ? 'on' : ''}`}
                aria-pressed={region === r.id && !searching}
                onClick={() => pickRegion(r.id)}
              >
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <a className="finder__geo" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
          <MapPin size={17} />
          <span>Use my location to order</span>
          <ArrowUpRight size={13} />
        </a>
        <p className="finder__geonote">Opens our online ordering page, which finds the shop closest to you.</p>
      </aside>

      <div className="finder__results">
        <div className="finder__head">
          <p className="finder__count" aria-live="polite">{summary}</p>
          {searching && (
            <button type="button" className="tlink finder__all" onClick={showAll}>Show all shops</button>
          )}
        </div>
        {results.length > 0 ? (
          <ul className="finder__list">
            {results.map((l) => <LocationCard key={l.id} loc={l} />)}
          </ul>
        ) : (
          <p className="finder__empty">
            {search?.kind === 'zip'
              ? 'We do not know that ZIP code. Check the number, or browse every shop.'
              : 'No shop by that name. Try your ZIP code instead, or browse every shop.'}
          </p>
        )}
      </div>
    </div>
  )
}
