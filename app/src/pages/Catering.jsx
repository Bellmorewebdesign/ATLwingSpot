import { CATERING_PACKAGES } from '../data/catering'
import { CATERING_URL } from '../data/site'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { ZipLookup } from '../components/ZipLookup'
import { ArrowRight, ArrowUpRight } from '../components/Icons'
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
          <a href="#request" className="btn btn-ink btn-lg cat__cta">Set up catering <ArrowRight /></a>
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

      {/* Two real routes instead of a form that went nowhere: order the trays
          on DoorDash, or call the shop that is going to make them. */}
      <section className="sec ch-paper cat__order" id="request">
        <div className="wrap wrap-tight cat__order-in">
          <div className="cat__order-head">
            <h2 className="dsp dsp-sm">Two ways<br />to book it.</h2>
            <p className="cat__order-sub">
              Trays go through DoorDash catering. For a big headcount, a date or anything
              particular about the sauces, call the shop first.
            </p>
          </div>

          <div className="cat__routes">
            <div className="cat__route">
              <span className="cat__route-n">01</span>
              <h3 className="cat__route-h">Order the trays</h3>
              <p className="cat__route-d">
                DoorDash carries the catering trays for pickup or delivery.
              </p>
              <a
                className="btn btn-orange btn-lg cat__route-cta"
                href={CATERING_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                DoorDash catering <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="cat__route">
              <span className="cat__route-n">02</span>
              <h3 className="cat__route-h">Call the shop</h3>
              <p className="cat__route-d">
                Find the shop nearest the address you are feeding and talk it through.
              </p>
              <div className="cat__route-zip">
                <ZipLookup heading="Shop nearest your event" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
