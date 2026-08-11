import { Link } from 'react-router-dom'
import { CATERING_SCENES } from '../data/catering'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './CateringTeaser.css'

export function CateringTeaser({ index = '10' }) {
  return (
    <section className="section catering-teaser" id="catering">
      <div className="container-wide catering-teaser__grid">
        <div className="catering-teaser__copy">
          <Reveal><p className="eyebrow"><span className="dot" /> {index} — Catering</p></Reveal>
          <h2 className="catering-teaser__scenes font-display">
            {CATERING_SCENES.map((s, i) => (
              <Reveal as="span" key={s} className={`catering-teaser__scene ${i === CATERING_SCENES.length - 1 ? 'is-punch' : ''}`} delay={i * 70} clip>
                <span>{s}</span>
              </Reveal>
            ))}
          </h2>
          <Reveal delay={120}>
            <p className="lead catering-teaser__lead">
              Trays of wings, tenders and waffle fries built to feed the whole room. Pick your flavors, we handle the rest.
            </p>
          </Reveal>
          <Reveal delay={180} className="catering-teaser__actions">
            <Link to="/catering" className="btn btn--orange">Start a catering request <ArrowRight /></Link>
            <Link to="/catering" className="link-arrow">See catering trays <ArrowRight /></Link>
          </Reveal>
        </div>

        <Reveal className="catering-teaser__media" delay={100}>
          <img src={asset('assets/food/boneless-combo.jpg')} alt="ATL Wing Spot boneless combo tray" loading="lazy" decoding="async" />
          <div className="catering-teaser__badge">
            <span className="catering-teaser__badge-num font-display">100</span>
            <span className="catering-teaser__badge-txt">wings, one tray</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
