import { Link } from 'react-router-dom'
import { FEATURED_REGIONS } from '../data/locations'
import { Reveal } from './Reveal'
import { ArrowRight, MapPin } from './Icons'
import './LocationsPreview.css'

export function LocationsPreview({ index = '08' }) {
  return (
    <section className="section loc-prev" id="locations">
      <div className="container-wide">
        <div className="loc-prev__head">
          <div>
            <Reveal><p className="eyebrow"><span className="dot" /> {index} — Locations</p></Reveal>
            <Reveal delay={80}>
              <h2 className="section-title loc-prev__title">
                Your ATL is closer<br />than <span className="accent-c">you think.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <Link to="/locations" className="btn btn--orange loc-prev__cta">
              Find my spot <ArrowRight />
            </Link>
          </Reveal>
        </div>

        <div className="loc-prev__grid">
          {FEATURED_REGIONS.map((r, i) => (
            <Reveal key={r.id} as={Link} to="/locations" className="loc-prev__region" delay={i * 70}>
              <span className="loc-prev__pin"><MapPin size={18} /></span>
              <span className="loc-prev__count">{r.count}</span>
              <h3 className="loc-prev__region-name font-display">{r.name}</h3>
              <span className="loc-prev__note">{r.note}</span>
              <span className="loc-prev__state">{r.state}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
