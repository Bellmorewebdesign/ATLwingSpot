import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { TURNSTILE_SITE_KEY } from '../data/site'
import { Reveal } from '../components/Reveal'
import { InquiryForm } from '../components/InquiryForm'
import {
  submitFranchiseInquiry,
  cooldownRemaining,
  startCooldown,
} from '../lib/franchiseSubmit'
import { JumpButton } from '../components/JumpButton'
import { ArrowRight } from '../components/Icons'
import './Franchise.css'

// This site IS ATL Wing Spot, so the franchise page speaks as the franchisor:
// first person throughout, no "ATL reports" or "the brand" third-person framing.
// Still no projections, no ROI and no earnings claims.
const POINTS = [
  { t: 'Most orders come in online', d: 'More than 65% of our customers order digitally.' },
  { t: 'Small footprint', d: 'About 1,000 sq ft on average. Our first shop was 800.' },
  { t: 'Vendor pricing already negotiated', d: 'We set supply agreements across the system, so you buy on our terms from day one.' },
  { t: 'Delivery rates already contracted', d: 'We negotiate third-party delivery terms, so you are not starting that conversation yourself.' },
  { t: '25+ sauces and a secret menu', d: 'A board built for regulars who want something different each visit.' },
  { t: 'Training and ongoing support', d: 'We train your team before you open and stay on the phone after you do.' },
]

/**
 * These are the figures already published in ATL's franchise materials, now
 * stated in the first person because this is ATL's own site.
 *
 * NEEDS CONFIRMATION before this page goes live:
 *   $1.68M  the source material said only "sales figure", with no unit, period
 *           or scope. "Average unit volume" is the most likely reading of a
 *           franchisor figure at that magnitude, but it is an ESTIMATE of what
 *           the number means, not a verified label. A sales number like this is
 *           a Financial Performance Representation: in the US it can only be
 *           published if it appears in Item 19 of the current FDD, with the
 *           wording Item 19 requires. Confirm it is in Item 19 and confirm what
 *           it measures, or delete this row.
 *   The three investment figures and the sq ft average are ATL-published but
 *   undated. Confirm they match the current FDD.
 *   65% digital orders is ATL-published but undated. Confirm it still holds.
 */
const FIGURES = [
  { v: '$242,000', l: 'Average investment', n: 'Our published figure' },
  { v: '$216,300', l: 'Minimum initial investment, including franchise fee', n: 'Our published figure' },
  { v: '$25,000', l: 'Franchise fee', n: 'Our published figure' },
  { v: '~1,000 sq ft', l: 'Average store size', n: 'Our published average' },
  { v: '$1.68M', l: 'Average unit volume', n: 'Not a projection or guarantee' },
]

/**
 * Franchise disclaimer, shown under the enquiry form.
 *
 * VERBATIM, and it stays that way. This is the wording ATL supplied, reproduced
 * exactly: the state-registration language is a legal instrument, not copy, so
 * it does not get tightened, split, reworded to match the page's voice, or run
 * through the house style rules the rest of this site follows. If it needs to
 * change, it changes because ATL or their counsel says so.
 *
 * It sits directly under the form because that is the point at which someone is
 * being solicited. The financial figures above carry their own inline caveats
 * in FIGURES rather than being answered down here.
 */
const DISCLAIMER =
  'This is not a franchise offering. A franchise offering can be made by us only in a ' +
  'state if we are first registered, excluded, exempted or otherwise qualified to offer ' +
  'franchises in that state, and only if we provide you with an appropriate franchise ' +
  'disclosure document. Follow-up or individualized responses to you that involve either ' +
  'effecting or attempting to effect the sale of a franchise will be made only if we are ' +
  'first in compliance with state registration requirements, or are covered by an ' +
  'applicable state exclusion or exemption.'

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
        description="Open an ATL Wing Spot. Halal wings out of a compact kitchen with a digital-first customer base, proven on Long Island since 2023."
      />

      <header className="fr__mast ch-dark">
        <div className="wrap fr__mast-in">
          <div>
            <h1 className="dsp dsp-lg fr__h1">Open<br />an <span className="t-orange">ATL.</span></h1>
            <p className="fr__lede">
              Wings, tenders and waffles out of a small kitchen, with a sauce board people drive
              across the island for. We&rsquo;re opening in new markets now.
            </p>
            <JumpButton targetId="enquire" className="btn btn-orange btn-lg fr__cta">Request information <ArrowRight /></JumpButton>
          </div>
          <div className="fr__award">
            <img
                src={asset('assets/brand/long-island-choice-award.png')}
                alt="Long Island Choice Awards winner"
                width="110"
                height="105"
                loading="lazy"
                decoding="async"
              />
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
          <h2 className="dsp dsp-sm fr__h2">The numbers we publish</h2>
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
            These figures come from our current franchise materials and describe different things, so
            they are not directly comparable. Nothing here is a projection, guarantee or promise of
            earnings, sales or profitability. This page is informational only and is subject to our
            current Franchise Disclosure Document, which we will send you before anything is signed.
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
            {/* The one form on the site that posts somewhere real. It goes to
                a Lambda behind an API Gateway endpoint which validates it,
                rate limits it and emails it on through SES; the handler and
                its setup live in aws/franchise-form/. The honeypot name is
                deliberately bland so no browser autofill recognises it. */}
            <InquiryForm
              fields={FIELDS}
              submitLabel="Request information"
              submit={submitFranchiseInquiry}
              honeypot="contactReason2"
              captcha={{ siteKey: TURNSTILE_SITE_KEY, action: 'franchise' }}
              cooldownRemaining={cooldownRemaining}
              onCooldownStart={startCooldown}
              successTitle="Request sent."
              successMessage="It is with our franchise team and someone will follow up by email."
              note={
                <p className="mform__note">
                  We use your details to answer this enquiry. Nothing here is an offer
                  to sell a franchise; see the disclaimer below.
                </p>
              }
            />
          </div>
        </div>

        <div className="wrap wrap-tight fr__legal">
          <h2 className="fr__legal-h">Franchise disclaimer</h2>
          <p className="fineprint fr__legal-p">{DISCLAIMER}</p>
        </div>
      </section>
    </div>
  )
}
