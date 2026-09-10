import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { ArrowRight } from './Icons'
import './GroupBand.css'

/**
 * The step down out of the hero. ATL's four-basket group shot, keyed off its
 * studio ground so it sits on the warm cream instead of inside a white box,
 * carries the transition on its own with one short line of copy beside it.
 * It is the only group photograph on the page — the sections below stay on
 * single dishes so the food never repeats itself.
 */
export function GroupBand() {
  return (
    <section className="gband ch-warm" id="baskets">
      <div className="wrap gband__in">
        <Reveal className="gband__shot">
          <img
            src={asset('assets/food/client-refresh/wing-basket-group.webp')}
            alt="Four ATL Wing Spot baskets stacked up, each in a different sauce"
            width="1434" height="907"
            loading="lazy"
            decoding="async"
          />
        </Reveal>

        <Reveal className="gband__copy" delay={90}>
          <p className="kicker gband__kick">Fried to order</p>
          <h2 className="dsp dsp-sm gband__title">Line them<br />up.</h2>
          <p className="gband__line">
            Bone-in, boneless, tenders. Nothing hits the fryer until the order does, and
            every basket gets tossed in the sauce you picked.
          </p>
          <div className="gband__acts">
            <Link className="btn btn-ink" to="/menu">See the menu <ArrowRight /></Link>
            <Link className="tlink" to="/flavors">Pick a flavor <ArrowRight /></Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
