import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { StatCounter } from '../components/StatCounter'
import { MockupForm } from '../components/MockupForm'
import { Check, ArrowRight } from '../components/Icons'
import './Franchise.css'

const CLAIMS = [
  { t: 'Digital-first demand', d: 'ATL reports more than 65% of customers order online.' },
  { t: 'Pre-negotiated vendor pricing', d: 'Supply relationships set up at the brand level.' },
  { t: 'Contracted delivery rates', d: 'Third-party delivery rates negotiated by the brand.' },
  { t: 'Compact footprint', d: 'Stores run around 1,000 sq ft on ATL’s published average.' },
  { t: '25+ flavors + a secret menu', d: 'A menu built for variety and repeat visits.' },
  { t: 'Training & ongoing support', d: 'Onboarding and continued operational support.' },
]

// Figures are ATL-provided, using ATL's own terminology. They describe
// different metrics and are not projections. Displayed with clear labels only.
const FIGURES = [
  { label: 'Average Investment', value: '$242,000', note: 'ATL-listed figure' },
  { label: 'Minimum initial investment (incl. franchise fee)', value: '$216,300', note: 'ATL-listed figure' },
  { label: 'Franchise fee', value: '$25,000', note: 'ATL-listed figure' },
  { label: 'Average store size', value: '~1,000 sq ft', note: 'ATL published average' },
  { label: 'Sales figure shown', value: '$1.68M', note: 'ATL-shown figure — not a projection' },
]

const FIELDS = [
  { name: 'firstName', label: 'First Name', type: 'text', required: true, autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true, autoComplete: 'family-name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, autoComplete: 'tel' },
  { name: 'territory', label: 'State / Territory of Interest', type: 'text', required: true, placeholder: 'e.g. New York, New Jersey, California' },
  { name: 'message', label: 'Message', type: 'textarea', full: true, placeholder: 'Tell us about your market and experience…' },
]

export default function Franchise() {
  return (
    <div className="page franchise-page">
      <Seo title="Franchise" description="Build your own ATL. A bold, digital-first wing concept with a compact footprint, proven on Long Island. Explore ATL Wing Spot franchising." />

      {/* HERO */}
      <header className="franchise-hero">
        <div className="container-wide franchise-hero__inner">
          <div className="franchise-hero__copy">
            <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> Franchise</p></Reveal>
            <h1 className="franchise-hero__title font-display">Build<br />your own<br /><span className="accent-o">ATL.</span></h1>
            <Reveal delay={120}><p className="franchise-hero__sub">A bold wing concept built for the way people order today.</p></Reveal>
            <Reveal delay={180} className="franchise-hero__actions">
              <a href="#franchise-form" className="btn btn--orange btn--lg">Request franchise info <ArrowRight /></a>
            </Reveal>
          </div>
          <Reveal delay={120} className="franchise-hero__award">
            <img src={asset('assets/brand/long-island-choice-award.png')} alt="Long Island Choice Awards — Winner" />
            <span>Voted Best Wings<br />on Long Island</span>
          </Reveal>
        </div>
      </header>

      {/* WOW DATA MOMENT */}
      <section className="franchise-data">
        <img className="franchise-data__food" src={asset('assets/food/crispy-tenders-cutout.png')} alt="" loading="lazy" />
        <div className="container-wide">
          <Reveal><h2 className="franchise-data__lead font-display">Compact<br /><span className="accent-c">by design.</span></h2></Reveal>
          <div className="franchise-data__stats">
            <StatCounter className="franchise-data__big" value={1000} prefix="~" suffix="" accent="cream" label="sq ft — ATL published average" />
            <StatCounter className="franchise-data__big" value={65} suffix="%+" accent="orange" label="customers online — ATL franchise material" />
          </div>
          <p className="franchise-data__caption">A small footprint and a digital-first customer base — the reason a premium online experience matters.</p>
        </div>
      </section>

      {/* CLAIMS */}
      <section className="section franchise-claims">
        <div className="container-wide">
          <div className="divider-label">Why ATL</div>
          <div className="franchise-claims__grid">
            {CLAIMS.map((c, i) => (
              <Reveal as="article" key={c.t} className="claim-card" delay={(i % 3) * 50}>
                <span className="claim-card__check"><Check size={18} /></span>
                <h3 className="claim-card__title">{c.t}</h3>
                <p className="claim-card__desc">{c.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FIGURES */}
      <section className="section franchise-figures">
        <div className="container-wide">
          <div className="divider-label">The Numbers <span className="text-orange">ATL-published</span></div>
          <div className="franchise-figures__grid">
            {FIGURES.map((f) => (
              <Reveal as="div" key={f.label} className="figure">
                <span className="figure__value font-display">{f.value}</span>
                <span className="figure__label">{f.label}</span>
                <span className="figure__note">{f.note}</span>
              </Reveal>
            ))}
          </div>
          <p className="franchise-figures__disclaimer">
            Figures above are ATL-provided and reflect ATL’s current published franchise materials. They describe
            different metrics and are not a projection or guarantee of individual results. Franchise information is
            informational only and subject to the current Franchise Disclosure Document (FDD).
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="section franchise-form-section" id="franchise-form">
        <div className="container franchise-form-wrap">
          <div className="franchise-form__intro">
            <Reveal><p className="eyebrow"><span className="dot" /> Get started</p></Reveal>
            <Reveal delay={80}><h2 className="section-title">Request<br /><span className="accent-o">franchise info.</span></h2></Reveal>
            <Reveal delay={140}><p className="lead">Tell us about your market. This is a concept preview — nothing is submitted yet.</p></Reveal>
          </div>
          <Reveal delay={100} className="franchise-form__card">
            <MockupForm
              fields={FIELDS}
              submitLabel="Request information"
              concept={{
                title: 'Franchise Inquiry Received',
                summary: 'Great — that would’ve reached the ATL franchise team',
                message: 'This is a preview of the proposed franchise inquiry experience. Submission is disabled in this website concept.',
              }}
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
