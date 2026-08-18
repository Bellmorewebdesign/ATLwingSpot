import { Seo } from '../components/Seo'
import { LocationFinder } from '../components/LocationFinder'
import './Locations.css'

export default function Locations() {
  return (
    <div className="page locs ch-cream">
      <Seo
        title="Locations"
        description="Find your ATL Wing Spot. Shops across Long Island, Queens, Manhattan, New Jersey and California. Order pickup or delivery."
      />

      <header className="mast wrap">
        <h1 className="dsp dsp-lg">Find your<br /><span className="t-cyan">ATL.</span></h1>
        <p className="mast__sub">Search by city or ZIP, or pick a region.</p>
      </header>

      <div className="wrap locs__body">
        <LocationFinder />
      </div>
    </div>
  )
}
