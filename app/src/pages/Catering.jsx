import { CATERING_PACKAGES } from '../data/catering'
import { LOCATIONS } from '../data/locations'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { MockupForm } from '../components/MockupForm'
import { ArrowRight } from '../components/Icons'
import './Catering.css'

const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, autoComplete: 'tel' },
  { name: 'date', label: 'Event date', type: 'date' },
  { name: 'guests', label: 'How many people', type: 'number', placeholder: 'e.g. 40' },
  {
    name: 'location', label: 'Which shop', type: 'select',
    options: LOCATIONS.map((l) => `${l.name} — ${l.city}, ${l.state}`),
    placeholder: 'Pick a location',
  },
  { name: 'message', label: 'Anything else', type: 'textarea', full: true, placeholder: 'Sauces, timing, drop-off…' },
]

const GROUPS = ['Wings', 'Boneless', 'Tenders', 'Starter', 'Side']

export default function Catering() {
  return (
    <div className="page cat">
      <Seo
        title="Catering"
        description="ATL Wing Spot catering — trays of wings, tenders, mozzarella sticks and waffle fries for game day, the office or a party. Tell us the headcount."
      />

      {/* Orange takeover masthead with the food at full scale */}
      <header className="cat__mast ch-orange">
        <img className="cat__food" src={asset('assets/food/wings-basket-cutout.png')} alt="" loading="lazy" aria-hidden="true" />
        <div className="wrap cat__mast-in">
          <h1 className="dsp dsp-lg cat__h1">Feed<br />everybody.</h1>
          <p className="cat__sub">
            Fifty wings or five hundred. Trays of tenders, mozzarella sticks and waffle fries.
            Give us the headcount and the sauces.
          </p>
          <a href="#request" className="btn btn-ink btn-lg cat__cta">Set up catering <ArrowRight /></a>
        </div>
      </header>

      <section className="sec ch-cream">
        <div className="wrap">
          <h2 className="dsp dsp-sm cat__h2">Trays</h2>
          <p className="cat__note">Prices and availability vary by location.</p>

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
                      <span className="tray__price">{p.price}</span>
                    </Reveal>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section className="sec ch-paper cat__form-sec" id="request">
        <div className="wrap-tight cat__form-wrap">
          <div>
            <h2 className="dsp dsp-sm">Tell us<br />the headcount.</h2>
            <p className="cat__form-sub">
              Send the details and your local shop picks it up from there.
            </p>
          </div>
          <div className="cat__card">
            <MockupForm
              fields={FIELDS}
              submitLabel="Send request"
              concept={{
                title: 'Request received',
                summary: 'That would have gone to your local shop',
                message:
                  'This is a preview of the proposed catering request. Submission is switched off in this website concept.',
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
