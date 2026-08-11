import { MILESTONES } from '../data/story'
import { PROOF } from '../data/site'
import { asset } from '../lib/asset'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { OrderButton } from '../components/OrderButton'
import { Link } from 'react-router-dom'
import { ArrowRight } from '../components/Icons'
import './Story.css'

export default function Story() {
  return (
    <div className="page story-page">
      <Seo title="Our Story" description="Two friends, an 800 sq ft shop, and one big bet. How ATL Wing Spot went from a Long Island opening to a 1M+ TikTok breakout and a growing franchise." />

      <header className="page-hero container-wide story-hero">
        <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> Our Story</p></Reveal>
        <h1 className="story-hero__title font-display">
          <Reveal as="span" className="story-hero__line" clip><span>Two friends.</span></Reveal>
          <Reveal as="span" className="story-hero__line accent" delay={90} clip><span>800 sq ft.</span></Reveal>
          <Reveal as="span" className="story-hero__line" delay={180} clip><span>One big bet.</span></Reveal>
        </h1>
        <Reveal delay={140}>
          <p className="page-hero__sub story-hero__sub">
            In May 2023, two friends saved up and opened the first ATL Wing Spot in an approximately 800-square-foot shop. A month later, the internet found it.
          </p>
        </Reveal>
      </header>

      <section className="story-band">
        <div className="container-wide story-band__inner">
          {PROOF.map((p) => (
            <Reveal key={p.value} className="story-band__item">
              <span className="story-band__label">{p.label}</span>
              <span className="story-band__value font-display">{p.value}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section story-chapters">
        <div className="container-wide">
          {MILESTONES.map((m, i) => (
            <Reveal as="article" key={m.id} className={`chapter ${i % 2 ? 'chapter--flip' : ''}`}>
              <div className="chapter__stat">
                <span className="chapter__num font-display">{m.stat}</span>
                <span className="chapter__unit">{m.statUnit}</span>
              </div>
              <div className="chapter__body">
                <span className="chapter__marker">{m.marker}</span>
                <h2 className="chapter__title font-display">{m.title}</h2>
                <p className="chapter__text">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="story-feast" aria-hidden="true">
        <img src={asset('assets/food/fruity-pebbles-chicken-waffles.jpg')} alt="" loading="lazy" />
        <img src={asset('assets/food/hero-wings.jpg')} alt="" loading="lazy" />
      </section>

      <section className="section story-close">
        <div className="container-wide story-close__inner">
          <Reveal><h2 className="story-close__headline font-display">Now we’re<br />just getting<br /><span className="accent-o">started.</span></h2></Reveal>
          <Reveal delay={120} className="story-close__actions">
            <OrderButton size="lg">Taste what the hype’s about</OrderButton>
            <Link to="/franchise" className="btn btn--ghost btn--lg">Own an ATL <ArrowRight /></Link>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
