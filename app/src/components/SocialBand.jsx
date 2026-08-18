import { SOCIAL, BRAND } from '../data/site'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { Instagram, TikTok, ArrowUpRight } from './Icons'
import './SocialBand.css'

// Real ATL food photography, presented as ATL's own pictures — no invented
// handles, captions, comments or follower counts. The only number here is
// the verified 1M+ view breakout.
const SHOTS = [
  { src: 'assets/food/fruity-pebbles-chicken-waffles.jpg', alt: "Fruity Pebbles chicken and waffles" },
  { src: 'assets/food/saucy-tenders.jpg', alt: 'Saucy tenders' },
  { src: 'assets/food/chipotle-chicken-sandwich.jpg', alt: 'Chipotle chicken sandwich' },
]

export function SocialBand() {
  return (
    <section className="sband ch-cream" id="social">
      <div className="wrap sband__in">
        <div className="sband__shots" aria-hidden="true">
          {SHOTS.map((s, i) => (
            <Reveal key={s.src} className={`sband__shot s${i}`} delay={i * 80}>
              <img src={asset(s.src)} alt="" loading="lazy" decoding="async" />
            </Reveal>
          ))}
          <span className="seal sband__seal">
            1M+ views<br />the post that<br />started it
          </span>
        </div>

        <Reveal className="sband__copy">
          <h2 className="dsp dsp-md sband__title">More on<br />the feed.</h2>
          <p className="sband__line">
            A month after opening, one video crossed a million views and the line went around the block.
            We still post everything coming out of the fryer.
          </p>
          <div className="sband__links">
            <a className="btn btn-ink" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={18} /> Instagram <ArrowUpRight />
            </a>
            <a className="btn btn-line" href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer">
              <TikTok size={18} /> TikTok <ArrowUpRight />
            </a>
          </div>
          <p className="sband__handle">{BRAND.handle}</p>
        </Reveal>
      </div>
    </section>
  )
}
