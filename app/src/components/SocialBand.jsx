import { SOCIAL, BRAND } from '../data/site'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { Instagram, TikTok, ArrowUpRight } from './Icons'
import './SocialBand.css'

// Real ATL food photography, presented as ATL's own pictures. No invented
// handles, captions, comments or follower counts. The only number here is the
// verified 1M+ view breakout.
//
// Three dishes the rest of the page does not show, so the feed adds something
// instead of repeating the sections above it.
const SHOTS = [
  { src: 'assets/food/client-refresh/mac-and-cheese.webp',      w: 700, h: 1008, alt: 'A cup of ATL Wing Spot mac and cheese, forkful lifted out' },
  { src: 'assets/food/client-refresh/honey-bbq-club-wrap.webp', w: 820, h: 586,  alt: 'A honey BBQ club wrap cut open' },
  { src: 'assets/food/client-refresh/sauced-waffle-fries.webp', w: 820, h: 625,  alt: 'Waffle fries tossed in buffalo sauce in a cyan ATL box' },
]

export function SocialBand() {
  return (
    <section className="sband ch-cream" id="social">
      <div className="wrap sband__in">
        <div className="sband__shots">
          {SHOTS.map((s, i) => (
            <Reveal key={s.src} className={`sband__shot s${i}`} delay={i * 80}>
              <img
                src={asset(s.src)}
                alt={s.alt}
                width={s.w}
                height={s.h}
                loading="lazy"
                decoding="async"
              />
            </Reveal>
          ))}
          <span className="seal sband__seal">
            1M+ views<br />the post that<br />started it
          </span>
        </div>

        <Reveal className="sband__copy">
          <h2 className="dsp dsp-md sband__title">More on<br />the feed.</h2>
          <p className="sband__line">
            A month after opening, one video crossed a million views. We still post everything
            coming out of the fryer.
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
