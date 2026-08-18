import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { ArrowRight } from './Icons'
import './FranchiseStrip.css'

// Deliberately slim: the homepage shouldn't stop for an investor pitch.
export function FranchiseStrip() {
  return (
    <section className="fstrip ch-cyan">
      <div className="wrap fstrip__in">
        <img className="fstrip__award" src={asset('assets/brand/long-island-choice-award.png')} alt="" loading="lazy" aria-hidden="true" />
        <p className="dsp fstrip__txt">Want to open an ATL?</p>
        <Link className="btn btn-ink" to="/franchise">Franchising <ArrowRight /></Link>
      </div>
    </section>
  )
}
