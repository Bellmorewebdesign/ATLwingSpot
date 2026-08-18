import { Link } from 'react-router-dom'
import { LOCATIONS } from '../data/locations'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './LocationsBand.css'

// Split-screen: statement on the left, a real scannable list on the right.
export function LocationsBand() {
  const regions = [...new Set(LOCATIONS.map((l) => l.region))]
  const counts = regions.map((r) => ({
    region: r,
    count: LOCATIONS.filter((l) => l.region === r).length,
    states: [...new Set(LOCATIONS.filter((l) => l.region === r).map((l) => l.state))].join(', '),
  }))

  return (
    <section className="lband ch-paper" id="locations">
      <div className="wrap lband__grid">
        <div className="lband__left">
          <Reveal><h2 className="dsp dsp-md lband__title">Find your<br /><span className="t-cyan">ATL.</span></h2></Reveal>
          <Reveal delay={90}>
            <p className="lband__sub">
              {LOCATIONS.length} shops open across New York, New Jersey and California. The original is still
              on Broadway in Lynbrook.
            </p>
            <Link to="/locations" className="btn btn-ink lband__cta">All locations <ArrowRight /></Link>
          </Reveal>
        </div>

        <Reveal className="lband__right" delay={60}>
          <ul className="lband__list">
            {counts.map((c) => (
              <li key={c.region}>
                <Link to="/locations" className="lband__row">
                  <span className="lband__region">{c.region}</span>
                  <span className="lband__meta">{c.states}</span>
                  <span className="lband__n">{c.count}</span>
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
