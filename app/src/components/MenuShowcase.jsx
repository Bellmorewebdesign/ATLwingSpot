import { Link } from 'react-router-dom'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import { ArrowUpRight } from './Icons'
import './MenuShowcase.css'

const TILES = [
  { area: 'wings', cat: 'wings', kind: 'photo', title: 'Bone-In Wings', copy: 'Fresh, never frozen. 25+ flavors.', img: 'assets/food/hero-wings.jpg', size: 'lg' },
  { area: 'waffles', cat: 'waffles', kind: 'photo', title: "Chicken N' Waffles", copy: 'The one that went viral.', img: 'assets/food/fruity-pebbles-chicken-waffles.jpg', size: 'lg', badge: 'Viral' },
  { area: 'tenders', cat: 'tenders', kind: 'photo', title: 'Saucy Tenders', copy: 'Jumbo. Hand-breaded.', img: 'assets/food/saucy-tenders.jpg' },
  { area: 'boneless', cat: 'boneless', kind: 'photo', title: 'Boneless', copy: 'All white meat.', img: 'assets/food/boneless-combo.jpg' },
  { area: 'sand', cat: 'sandwiches', kind: 'photo', title: 'Sandwiches', copy: 'Crispy chicken, house sauces.', img: 'assets/food/chipotle-chicken-sandwich.jpg' },
  { area: 'shakes', cat: 'desserts', kind: 'cutout', title: 'Shakes + Sweets', copy: 'Reese’s, Fruity Pebbles, Oreo Blast & more.', img: 'assets/food/shakes-lineup.png' },
  { area: 'fries', cat: 'fries', kind: 'type', title: 'Loaded Fries', copy: 'Buffalo. Nashville hot. BBQ.' },
]

function Tile({ t }) {
  return (
    <Link to={`/menu?cat=${t.cat}`} className={`craving__tile craving__tile--${t.area} craving__tile--${t.kind} ${t.size === 'lg' ? 'is-lg' : ''}`}>
      {t.kind !== 'type' && (
        <div className="craving__media">
          <img src={asset(t.img)} alt={t.title} loading="lazy" decoding="async" />
        </div>
      )}
      <div className="craving__body">
        {t.badge && <span className="craving__badge">{t.badge}</span>}
        <h3 className="craving__title font-display">{t.title}</h3>
        <p className="craving__copy">{t.copy}</p>
        <span className="craving__go">See the lineup <ArrowUpRight size={16} /></span>
      </div>
    </Link>
  )
}

export function MenuShowcase() {
  return (
    <section className="section craving" id="craving">
      <div className="container-wide">
        <div className="craving__head">
          <div className="craving__head-left">
            <Reveal>
              <p className="eyebrow"><span className="dot" /> 01 — The Lineup</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="section-title craving__heading">
                What are<br />you <span className="accent-o">craving?</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <Link to="/menu" className="btn btn--ghost craving__all">Full Menu</Link>
          </Reveal>
        </div>

        <Reveal className="craving__grid">
          {TILES.map((t) => <Tile key={t.area} t={t} />)}
        </Reveal>
      </div>
    </section>
  )
}
