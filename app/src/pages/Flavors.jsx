import { HEAT_LEVELS, STYLES, FLAVORS } from '../data/flavors'
import { Seo } from '../components/Seo'
import { Reveal } from '../components/Reveal'
import { FlavorFinder } from '../components/FlavorFinder'
import { OrderButton } from '../components/OrderButton'
import { Flame } from '../components/Icons'
import './Flavors.css'

const HEAT_COLORS = { 1: 'var(--atl-cyan)', 2: 'var(--atl-orange)', 3: 'var(--atl-orange-bright)', 4: 'var(--atl-red)' }

function Pips({ level }) {
  return (
    <span className="fl-pips" aria-label={`Heat ${level} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={`fl-pips__dot ${n <= level ? 'is-on' : ''}`}
          style={n <= level ? { background: HEAT_COLORS[level] } : undefined} />
      ))}
    </span>
  )
}

export default function Flavors() {
  return (
    <div className="page flavors-page">
      <Seo title="Flavors" description="Find your ATL Wing Spot flavor. Pick your heat, wet or dry rub, and match with featured flavors from a 25+ flavor lineup." />

      <header className="page-hero page-hero--glow container-wide">
        <Reveal><p className="eyebrow page-hero__eyebrow"><span className="dot" /> Flavors</p></Reveal>
        <Reveal delay={80}><h1 className="page-hero__title">Find your <span className="accent-o">flavor.</span></h1></Reveal>
        <Reveal delay={140}><p className="page-hero__sub">The live menu runs 25+ flavors. Here’s a featured taste of the lineup — and a finder to narrow it to your move.</p></Reveal>
      </header>

      <FlavorFinder withHeader={false} />

      <section className="section flavors-grid-section">
        <div className="container-wide">
          <div className="divider-label">Featured Flavors <span className="text-orange">{FLAVORS.length}</span></div>
          <div className="flavors-grid">
            {FLAVORS.map((f, i) => (
              <Reveal as="article" key={f.id} className="fl-card" delay={i * 40} style={{ '--fc': HEAT_COLORS[f.heat] }}>
                <div className="fl-card__top">
                  <span className="fl-card__style">{f.style === 'wet' ? 'Wet' : 'Dry Rub'}</span>
                  <Pips level={f.heat} />
                </div>
                <h3 className="fl-card__name font-display">{f.name}</h3>
                <p className="fl-card__desc">“{f.descriptor}”</p>
                <span className="fl-card__heat">
                  <Flame size={13} /> {HEAT_LEVELS[f.heat - 1].label}
                </span>
              </Reveal>
            ))}
          </div>
          <p className="flavors-note">Featured flavors shown — not the full inventory. Ask in store for the current 25+ lineup{' '}and the secret menu.</p>
          <div className="flavors-cta">
            <OrderButton size="lg">Order your flavor</OrderButton>
          </div>
        </div>
      </section>
    </div>
  )
}
