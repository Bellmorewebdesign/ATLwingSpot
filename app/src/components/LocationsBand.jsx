import { Link } from 'react-router-dom'
import { LOCATIONS, STATE_GROUPS } from '../data/locations'
import { Reveal } from './Reveal'
import { ZipLookup } from './ZipLookup'
import { ArrowRight } from './Icons'
import './LocationsBand.css'

// Split-screen: statement on the left, a real scannable list on the right.
export function LocationsBand() {
  // "New York, New Jersey and California", built from whatever states have shops
  const names = STATE_GROUPS.map((s) => s.label)
  const stateList = names.length > 1
    ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    : names[0]

  return (
    <section className="lband ch-paper" id="locations">
      <div className="wrap lband__grid">
        <div className="lband__left">
          <Reveal><h2 className="dsp dsp-md lband__title">Find your<br /><span className="t-cyan">ATL.</span></h2></Reveal>
          <Reveal className="lband__zip" delay={60}><ZipLookup heading="Closest shop to you" /></Reveal>
          <Reveal delay={90}>
            <p className="lband__sub">
              {LOCATIONS.length} shops open across {stateList}. Pick one and
              we&rsquo;ll start frying.
            </p>
            <Link to="/locations" className="btn btn-ink lband__cta">All locations <ArrowRight /></Link>
          </Reveal>
        </div>

        <Reveal className="lband__right" delay={60}>
          <ul className="lband__list">
            {STATE_GROUPS.map((s) => (
              <li key={s.id}>
                <Link to="/locations" className="lband__row">
                  <span className="lband__region">{s.label}</span>
                  <span className="lband__meta">{s.shops.length} {s.shops.length === 1 ? 'shop' : 'shops'}</span>
                  <ArrowRight />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
