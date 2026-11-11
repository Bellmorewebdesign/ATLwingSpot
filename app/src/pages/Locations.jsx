import { Seo } from '../components/Seo'
import { PAGES } from '../data/routes'
import { locationsData } from '../data/structuredData'
import { LocationFinder } from '../components/LocationFinder'
import { LOCATIONS, COMING_SOON } from '../data/locations'
import './Locations.css'

const LOCATIONS_DATA = locationsData()

export default function Locations() {
  return (
    <div className="page locs ch-cream">
      <Seo page={PAGES.locations} data={LOCATIONS_DATA} />

      <header className="mast wrap">
        <h1 className="dsp dsp-lg">Find your<br /><span className="t-cyan">ATL.</span></h1>
        <p className="mast__sub">Put in your ZIP for the closest shop, or browse all {LOCATIONS.length} below.</p>
      </header>

      {/* One search box: the finder takes a ZIP (closest shops) or a town name. */}
      <div className="wrap locs__body">
        <LocationFinder />

        {/* Announced shops that are not open yet: city and state only. */}
        <section className="soon" aria-labelledby="soon-h">
          <h2 className="dsp soon__h" id="soon-h">Coming soon</h2>
          <p className="soon__sub">New ATL Wing Spot shops on the way.</p>
          <ul className="soon__list">
            {COMING_SOON.map((s) => (
              <li key={`${s.city}-${s.state}`} className="soon__item">
                <span className="soon__city">{s.city}</span>
                <span className="soon__state">{s.state}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
