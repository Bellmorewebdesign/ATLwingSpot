import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { StatCounter } from './StatCounter'
import { ArrowRight } from './Icons'
import './FranchiseTeaser.css'

export function FranchiseTeaser({ index = '11' }) {
  return (
    <section className="section franchise-teaser grain" id="franchise">
      <div className="container-wide franchise-teaser__grid">
        <div className="franchise-teaser__copy">
          <Reveal><p className="eyebrow"><span className="dot" /> {index} — Franchise</p></Reveal>
          <h2 className="franchise-teaser__title font-display">
            Build<br />your own<br /><span className="accent-o">ATL.</span>
          </h2>
          <Reveal delay={120}>
            <p className="lead franchise-teaser__lead">
              A bold wing concept built for the way people order today — compact footprint, digital-first, and already proven on Long Island.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <Link to="/franchise" className="btn btn--orange">Explore franchising <ArrowRight /></Link>
          </Reveal>
        </div>

        <Reveal className="franchise-teaser__panel" delay={100}>
          <div className="franchise-teaser__award">
            <img src={asset('assets/brand/long-island-choice-award.png')} alt="Long Island Choice Awards — Winner" loading="lazy" />
            <span>Voted Best Wings on Long Island</span>
          </div>
          <div className="franchise-teaser__stats">
            <StatCounter value={1000} suffix=" sq ft" accent="cyan" label="Avg. store size" sub="ATL published avg." />
            <StatCounter value={65} suffix="%+" accent="orange" label="Customers online" sub="ATL franchise material" />
          </div>
          <p className="franchise-teaser__disc">
            Figures are ATL-provided and informational — not a guarantee of performance. See the current Franchise Disclosure Document.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
