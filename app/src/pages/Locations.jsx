import { useMemo, useState } from 'react'
import { LOCATIONS, STATE_FILTERS } from '../data/locations'
import { ORDER_URL } from '../data/site'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { LocationCard } from '../components/LocationCard'
import { Search as SearchIcon, MapPin, ArrowUpRight } from '../components/Icons'
import './Locations.css'

export default function Locations() {
  const [query, setQuery] = useState('')
  const [stateF, setStateF] = useState('all')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LOCATIONS.filter((l) => {
      const matchState = stateF === 'all' || l.state === stateF
      const matchQuery = !q ||
        [l.name, l.city, l.state, l.zip, l.street, l.region].join(' ').toLowerCase().includes(q)
      return matchState && matchQuery
    })
  }, [query, stateF])

  return (
    <div className="page loc-page">
      <Seo title="Locations" description="Find your ATL Wing Spot. Locations across Long Island, Queens, Manhattan, New Jersey and California. Order pickup or delivery." />

      <header className="page-hero page-hero--glow container-wide">
        <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> Locations</p></Reveal>
        <Reveal delay={80}><h1 className="page-hero__title">Find your <span className="accent-c">ATL.</span></h1></Reveal>
        <Reveal delay={140}><p className="page-hero__sub">From where it started on Long Island to California — your spot’s closer than you think.</p></Reveal>
      </header>

      <div className="container-wide loc-page__controls">
        <div className="loc-page__search">
          <SearchIcon size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, ZIP or location…"
            aria-label="Search locations"
          />
        </div>
        <div className="loc-page__filters" role="group" aria-label="Filter by state">
          {STATE_FILTERS.map((s) => (
            <button
              key={s.id}
              className={`loc-page__filter ${stateF === s.id ? 'is-active' : ''}`}
              aria-pressed={stateF === s.id}
              onClick={() => setStateF(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <a className="btn btn--ghost btn--sm loc-page__use" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
          <MapPin size={16} /> Use my location to order <ArrowUpRight size={14} />
        </a>
      </div>

      <div className="container-wide loc-page__body">
        <p className="loc-page__count">{results.length} location{results.length === 1 ? '' : 's'}</p>
        {results.length > 0 ? (
          <div className="loc-page__grid">
            {results.map((l, i) => (
              <Reveal key={l.id} delay={(i % 3) * 60}>
                <LocationCard loc={l} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="loc-page__empty">No locations match that search yet — try a nearby city or clear the filters.</p>
        )}
      </div>
    </div>
  )
}
