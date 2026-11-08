import { Seo } from '../components/Seo'
import { PAGES } from '../data/routes'
import { LocationFinder } from '../components/LocationFinder'
import { LOCATIONS } from '../data/locations'
import './Locations.css'

export default function Locations() {
  return (
    <div className="page locs ch-cream">
      <Seo page={PAGES.locations} />

      <header className="mast wrap">
        <h1 className="dsp dsp-lg">Find your<br /><span className="t-cyan">ATL.</span></h1>
        <p className="mast__sub">Put in your ZIP for the closest shop, or browse all {LOCATIONS.length} below.</p>
      </header>

      {/* One search box: the finder takes a ZIP (closest shops) or a town name. */}
      <div className="wrap locs__body">
        <LocationFinder />
      </div>
    </div>
  )
}
