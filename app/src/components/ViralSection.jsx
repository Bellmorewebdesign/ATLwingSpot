import { SOCIAL } from '../data/site'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { StatCounter } from './StatCounter'
import { Instagram, TikTok, ArrowUpRight } from './Icons'
import './ViralSection.css'

const REELS = [
  { img: 'assets/food/fruity-pebbles-chicken-waffles.jpg', tag: 'Fruity Pebbles' },
  { img: 'assets/food/hero-wings.jpg', tag: 'Buffalo Wings' },
  { img: 'assets/food/saucy-tenders.jpg', tag: 'Saucy Tenders' },
]

export function ViralSection() {
  return (
    <section className="section viral grain" id="viral">
      <div className="container-wide viral__inner">
        <div className="viral__lead">
          <Reveal><p className="eyebrow"><span className="dot" /> 02 — Culture</p></Reveal>
          <h2 className="viral__headline font-display">
            <Reveal as="span" className="viral__hl-row" clip><span>Viral</span></Reveal>
            <Reveal as="span" className="viral__hl-row viral__hl-row--o" delay={90} clip><span>for a</span></Reveal>
            <Reveal as="span" className="viral__hl-row" delay={180} clip><span>reason.</span></Reveal>
          </h2>
          <Reveal delay={120}>
            <p className="viral__copy">People came. They tasted. They posted. A month after two friends opened an 800&nbsp;sq&nbsp;ft shop, ATL broke out on TikTok — and the line hasn’t really stopped since.</p>
          </Reveal>
          <Reveal delay={200} className="viral__actions">
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="btn btn--cyan">
              <Instagram size={18} /> See ATL on Instagram <ArrowUpRight />
            </a>
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              <TikTok size={18} /> Watch on TikTok <ArrowUpRight />
            </a>
          </Reveal>
        </div>

        <div className="viral__reels" aria-hidden="true">
          {REELS.map((r, i) => (
            <Reveal key={r.tag} className={`viral__reel viral__reel--${i}`} delay={i * 90}>
              <img src={asset(r.img)} alt="" loading="lazy" decoding="async" />
              <span className="viral__reel-tag">● {r.tag}</span>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal className="viral__stats container-wide">
        <StatCounter value={2023} accent="cyan" label="Opened" sub="May 2023" />
        <StatCounter value={800} suffix=" sq ft" accent="orange" label="First shop" sub="Where it started" />
        <StatCounter value={1} suffix="M+" accent="cyan" label="TikTok breakout" sub="Views, one month in" />
        <StatCounter text="Best" accent="orange" label="Wings on Long Island" sub="Voted" />
        <StatCounter text="QSR" accent="cyan" label="Magazine" sub="Featured in" />
      </Reveal>
    </section>
  )
}
