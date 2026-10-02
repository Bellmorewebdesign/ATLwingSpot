import { Link } from 'react-router-dom'
import { CATERING_PACKAGES } from '../data/catering'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { ArrowRight } from '../components/Icons'
import './Catering.css'

const GROUPS = ['Wings', 'Boneless', 'Tenders', 'Starter', 'Side']

export default function Catering() {
  return (
    <div className="page cat">
      <Seo
        title="Catering"
        description="ATL Wing Spot catering. Trays of wings, tenders, mozzarella sticks and waffle fries for game day, the office or a party. Tell us the headcount."
      />

      {/* Orange takeover masthead with the food at full scale */}
      <header className="cat__mast ch-orange">
        <img
          className="cat__food"
          src={asset('assets/food/wings-basket-cutout.webp')}
          alt=""
          width="591"
          height="422"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <div className="wrap cat__mast-in">
          <h1 className="dsp dsp-lg cat__h1">Feed<br />everybody.</h1>
          <p className="cat__sub">
            Fifty wings or five hundred, plus trays of tenders, mozzarella sticks and waffle fries.
            Give us the headcount and which sauces, and your local shop takes it from there.
          </p>
          <Link className="btn btn-ink btn-lg cat__cta" to="/catering/book">
            Set up catering <ArrowRight />
          </Link>
        </div>
      </header>

      <section className="cat__wide ch-paper" aria-label="Wings by the tray">
        <img
          src={asset('assets/food/official/official-wings-30pc.webp')}
          alt="Three trays of our wings in different sauces"
          width="1800" height="712"
          loading="lazy"
          decoding="async"
        />
        <p className="cat__wide-cap">Thirty wings, three sauces. Scale it from there.</p>
      </section>

      <section className="sec ch-cream">
        <div className="wrap">
          <h2 className="dsp dsp-sm cat__h2">Trays</h2>
          <p className="cat__note">Availability varies by location.</p>

          {GROUPS.map((g) => {
            const set = CATERING_PACKAGES.filter((p) => p.tag === g)
            if (!set.length) return null
            return (
              <div className="tray" key={g}>
                <h3 className="tray__h">{g}</h3>
                <ul className="tray__items">
                  {set.map((p, i) => (
                    <Reveal as="li" className="tray__row" key={p.id} delay={i * 40}>
                      <span className="tray__name">
                        {p.name}{p.qty && <em> · {p.qty}</em>}
                      </span>
                    </Reveal>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Booking lives on its own page now. It was the smallest block on this
          page and the one thing people come here to do, so all this keeps is
          the way through to it. */}
      <section className="sec ch-paper cat__order">
        <div className="wrap wrap-tight cat__order-in">
          <div className="cat__order-head">
            <h2 className="dsp dsp-sm">Ready when<br />you are.</h2>
            <p className="cat__order-sub">
              Catering goes through the shop that will be cooking it. Find the closest one
              to your event and give them a call.
            </p>
          </div>
          <Link className="btn btn-orange btn-lg cat__order-cta" to="/catering/book">
            Set up catering <ArrowRight />
          </Link>
        </div>
      </section>
    </div>
  )
}
