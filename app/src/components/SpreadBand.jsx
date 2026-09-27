import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './SpreadBand.css'

// The three shakes ATL photographed individually. Names come straight from the
// promoted shake flavours already in the menu data.
const SHAKES = [
  { id: 'oreo',   name: 'Oreo Blast',            img: 'assets/food/official/official-oreo-shake.webp', w: 1440, h: 1800 },
  { id: 'pebble', name: 'Fruity Pebbles',        img: 'assets/food/official/official-fruity-pebbles-shake.webp', w: 1440, h: 1800 },
  { id: 'ctc',    name: 'Cinnamon Toast Crunch', img: 'assets/food/official/official-cinnamon-toast-crunch-shake.webp', w: 1440, h: 1800 },
]

// The waffle board, shot as one matched set: same box, same angle, same light,
// so the three line up the way the shakes above them do.
const WAFFLES = [
  { id: 'oreo',   name: 'Oreo',                 img: 'assets/food/client-refresh/waffle-oreo.webp', w: 900, h: 809 },
  { id: 'pebble', name: 'Fruity Pebbles',       img: 'assets/food/client-refresh/waffle-fruity-pebbles.webp', w: 900, h: 808 },
  { id: 'ctc',    name: 'Cinnamon Toast Crunch', img: 'assets/food/client-refresh/waffle-cinnamon-toast-crunch.webp', w: 900, h: 603 },
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
          <Reveal className="shakes__label"><p>Seven shakes on the board. Here are three of them.</p></Reveal>
          <ul className="shakes__row">
            {SHAKES.map((s, i) => (
              <Reveal as="li" className="shake" key={s.id} delay={i * 90}>
                <div className="shake__img">
                  <img
                    src={asset(s.img)}
                    alt={`${s.name} milkshake`}
                    width={s.w} height={s.h}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="shake__name">{s.name}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="spread__waffles">
          <Reveal className="waffles__head">
            <p className="waffles__label">Same waffle, three cereals on top.</p>
            <div className="waffles__hand">
              <img
                src={asset('assets/food/client-refresh/hand-waffle.webp')}
                alt="A hand lifting a waffle square out of the box"
                width="1100" height="1508"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
          <ul className="waffles__row">
            {WAFFLES.map((w, i) => (
              <Reveal as="li" className="waffle" key={w.id} delay={i * 90}>
                <div className="waffle__img">
                  <img
                    src={asset(w.img)}
                    alt={`${w.name} waffle`}
                    width={w.w} height={w.h}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span className="waffle__name">{w.name}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
