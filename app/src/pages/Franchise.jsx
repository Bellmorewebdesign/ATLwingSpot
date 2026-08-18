import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { MockupForm } from '../components/MockupForm'
import { ArrowRight } from '../components/Icons'
import './Franchise.css'

// Everything below is ATL's own published material, labelled as such.
// No projections, no ROI, no earnings claims.
const POINTS = [
  { t: 'Most orders come in online', d: 'ATL reports more than 65% of its customers order digitally.' },
  { t: 'Small footprint', d: 'Around 1,000 sq ft on ATL’s published average. The first shop was 800.' },
  { t: 'Vendor pricing already negotiated', d: 'Supply agreements are set at the brand level.' },
  { t: 'Delivery rates already contracted', d: 'Third-party delivery terms negotiated by the brand.' },
  { t: '25+ sauces and a secret menu', d: 'A board built for regulars who want something different each visit.' },
  { t: 'Training and ongoing support', d: 'Onboarding plus continued operational support.' },
]

const FIGURES = [
  { v: '$242,000', l: 'Average investment', n: 'ATL-listed figure' },
  { v: '$216,300', l: 'Minimum initial investment, including franchise fee', n: 'ATL-listed figure' },
  { v: '$25,000', l: 'Franchise fee', n: 'ATL-listed figure' },
  { v: '~1,000 sq ft', l: 'Average store size', n: 'ATL published average' },
  { v: '$1.68M', l: 'Sales figure shown in ATL materials', n: 'Not a projection or guarantee' },
]

const FIELDS = [
  { name: 'firstName', label: 'First name', type: 'text', required: true, autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last name', type: 'text', required: true, autoComplete: 'family-name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, autoComplete: 'tel' },
  { name: 'territory', label: 'State or territory of interest', type: 'text', required: true, placeholder: 'e.g. New Jersey' },
  { name: 'message', label: 'Tell us about your market', type: 'textarea', full: true },
]

export default function Franchise() {
  return (
    <div className="page fr">
      <Seo
        title="Franchise"
        description="Open an ATL Wing Spot. A halal wing concept with a compact footprint and a digital-first customer base, proven on Long Island since 2023."
      />

      <header className="fr__mast ch-dark">
        <div className="wrap fr__mast-in">
          <div>
            <h1 className="dsp dsp-lg fr__h1">Open<br />an <span className="t-orange">ATL.</span></h1>
            <p className="fr__lede">
              Wings, tenders and waffles out of a small kitchen, with a sauce board people drive across
              the island for. Now opening in new markets.
            </p>
            <a href="#enquire" className="btn btn-orange btn-lg fr__cta">Request information <ArrowRight /></a>
          </div>
          <div className="fr__award">
            <img src={asset('assets/brand/long-island-choice-award.png')} alt="Long Island Choice Awards winner" />
            <span>Voted best wings<br />on Long Island</span>
          </div>
        </div>
      </header>

      <section className="sec ch-cream">
        <div className="wrap">
          <h2 className="dsp dsp-sm fr__h2">What you get</h2>
          <ul className="fr__points">
            {POINTS.map((p, i) => (
              <Reveal as="li" className="pt" key={p.t} delay={(i % 3) * 50}>
                <h3 className="pt__t">{p.t}</h3>
                <p className="pt__d">{p.d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec ch-paper">
        <div className="wrap">
          <h2 className="dsp dsp-sm fr__h2">The numbers ATL publishes</h2>
          <ul className="fr__figs">
            {FIGURES.map((f) => (
              <li className="fig" key={f.l}>
                <span className="dsp fig__v">{f.v}</span>
                <span className="fig__l">{f.l}</span>
                <span className="fig__n">{f.n}</span>
              </li>
            ))}
          </ul>
          <p className="fineprint fr__disc">
            These figures come from ATL&rsquo;s current published franchise materials and describe different
            things, so they are not directly comparable. Nothing here is a projection, guarantee or
            promise of earnings, sales or profitability. Franchise information is informational only and
            is subject to the current Franchise Disclosure Document.
          </p>
        </div>
      </section>

      <section className="sec ch-cream" id="enquire">
        <div className="wrap-tight fr__form">
          <div>
            <h2 className="dsp dsp-sm">Tell us where.</h2>
            <p className="fr__form-sub">Send your market and we&rsquo;ll take it from there.</p>
          </div>
          <div className="fr__card">
            <MockupForm
              fields={FIELDS}
              submitLabel="Request information"
              concept={{
                title: 'Request received',
                summary: 'That would have reached the franchise team',
                message:
                  'This is a preview of the proposed franchise enquiry. Submission is switched off in this website concept.',
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
