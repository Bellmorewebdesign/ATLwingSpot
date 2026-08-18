import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './CateringBand.css'

// Full-bleed photography, right-aligned type — the counterweight to the
// left-led sections around it.
export function CateringBand() {
  return (
    <section className="cband" id="catering">
      <img
        className="cband__bg"
        src={asset('assets/food/hero-wings.jpg')}
        alt="A tray of ATL Wing Spot wings"
        loading="lazy"
        decoding="async"
      />
      <div className="wrap cband__in">
        <Reveal className="cband__col">
          <h2 className="dsp dsp-md cband__title">Feed<br />everybody.</h2>
          <p className="cband__line">
            Fifty wings. A hundred wings. Trays of tenders, mozzarella sticks and waffle fries.
            Tell us the headcount and the sauces.
          </p>
          <div className="cband__acts">
            <Link className="btn btn-orange btn-lg" to="/catering">Set up catering <ArrowRight /></Link>
            <Link className="tlink cband__link" to="/catering">See the trays</Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
