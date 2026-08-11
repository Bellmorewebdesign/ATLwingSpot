import { CATERING_PACKAGES, CATERING_SCENES } from '../data/catering'
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
  { name: 'date', label: 'Event Date', type: 'date' },
  { name: 'guests', label: 'Estimated Guests', type: 'number', placeholder: 'e.g. 40' },
  { name: 'location', label: 'Preferred Location', type: 'select', options: LOCATIONS.map((l) => `${l.name} — ${l.city}, ${l.state}`), placeholder: 'Choose a location' },
  { name: 'message', label: 'Message', type: 'textarea', full: true, placeholder: 'Tell us about your event, flavors, timing…' },
]

export default function Catering() {
  return (
    <div className="page catering-page">
      <Seo title="Catering" description="ATL Wing Spot catering — trays of wings, tenders, mozzarella sticks and waffle fries for game day, the office, or any party. Start a catering request." />

      <header className="page-hero container-wide catering-hero">
        <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> Catering</p></Reveal>
        <h1 className="catering-hero__scenes font-display">
          {CATERING_SCENES.map((s, i) => (
            <Reveal as="span" key={s} className={`catering-hero__scene ${i === CATERING_SCENES.length - 1 ? 'is-punch' : ''}`} delay={i * 70} clip>
              <span>{s}</span>
            </Reveal>
          ))}
        </h1>
        <Reveal delay={140}>
          <p className="page-hero__sub">Feed the whole room. Pick your flavors, we handle the trays.</p>
        </Reveal>
        <Reveal delay={200}>
          <a href="#catering-form" className="btn btn--orange btn--lg catering-hero__cta">Start a catering request <ArrowRight /></a>
        </Reveal>
      </header>

      <section className="section catering-trays">
        <div className="container-wide">
          <div className="divider-label">Catering Trays</div>
          <div className="catering-trays__grid">
            {CATERING_PACKAGES.map((p, i) => (
              <Reveal as="article" key={p.id} className="tray-card" delay={(i % 3) * 50}>
                <span className="tray-card__tag">{p.tag}</span>
                <h3 className="tray-card__name">{p.name}{p.qty && <span className="tray-card__qty"> · {p.qty}</span>}</h3>
                <span className="tray-card__price font-display">{p.price}</span>
              </Reveal>
            ))}
          </div>
          <p className="catering-trays__note">Pricing and availability may vary by location. Trays serve groups — ask your local ATL for exact counts.</p>
        </div>
      </section>

      <section className="section catering-form-section" id="catering-form">
        <div className="container catering-form-wrap">
          <div className="catering-form__intro">
            <Reveal><p className="eyebrow"><span className="dot" /> Let’s plan it</p></Reveal>
            <Reveal delay={80}><h2 className="section-title">Start a<br /><span className="accent-o">catering request.</span></h2></Reveal>
            <Reveal delay={140}><p className="lead">Send the details and your local ATL will follow up. This is a concept preview — nothing is submitted yet.</p></Reveal>
          </div>
          <Reveal delay={100} className="catering-form__card">
            <MockupForm
              fields={FIELDS}
              submitLabel="Send catering request"
              concept={{
                title: 'Catering Request Received',
                summary: 'Nice — that would’ve gone to your local ATL',
                message: 'This is a preview of the proposed catering inquiry experience. Submission is disabled in this website concept.',
              }}
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
