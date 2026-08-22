import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './SpreadBand.css'

// The three shakes ATL photographed individually. Names come straight from the
// promoted shake flavours already in the menu data.
const SHAKES = [
  { id: 'oreo',   name: 'Oreo Blast',           img: 'assets/food/official/official-oreo-shake.webp' },
  { id: 'pebble', name: 'Fruity Pebbles',       img: 'assets/food/official/official-fruity-pebbles-shake.webp' },
  { id: 'ctc',    name: 'Cinnamon Toast Crunch', img: 'assets/food/official/official-cinnamon-toast-crunch-shake.webp' },
]

/**
 * A light chapter built around ATL's official studio photography. Both the
 * spread and the shakes are lit on white, so the section itself is white and
 * the studio backgrounds disappear into it completely.
 */
export function SpreadBand() {
  return (
    <section className="spread ch-paper" id="spread">
      <div className="wrap spread__in">
        <Reveal className="spread__head">
          <h2 className="dsp dsp-md spread__title">
            Wings. Tenders.<br />Waffles. <span className="t-orange">Shakes.</span>
          </h2>
          <Link to="/menu" className="btn btn-ink spread__cta">See the menu <ArrowRight /></Link>
        </Reveal>

        <Reveal className="spread__shot" delay={80}>
          <img
            src={asset('assets/food/official/official-menu-spread.webp')}
            alt="A spread of ATL Wing Spot wings, tenders, waffles, fries, sandwiches and shakes"
            width="1800" height="1104"
            loading="lazy"
            decoding="async"
          />
        </Reveal>

        <div className="spread__shakes">
          <Reveal className="shakes__label"><p>Seven shakes on the board. These three get ordered most.</p></Reveal>
          <ul className="shakes__row">
            {SHAKES.map((s, i) => (
              <Reveal as="li" className="shake" key={s.id} delay={i * 90}>
                <div className="shake__img">
                  <img
                    src={asset(s.img)}
                    alt={`${s.name} milkshake`}
                    width="1440" height="1800"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="shake__name">{s.name}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
