import { useScrollProgress } from '../hooks/useScrollProgress'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { asset } from '../lib/asset'
import { Reveal } from './Reveal'
import './FoodInterlude.css'

const PANELS = [
  { word: 'Crispy.', sub: 'Fresh, never frozen. Hand-breaded to order.', img: 'assets/food/crispy-tenders-cutout.png', accent: 'cream' },
  { word: 'Saucy.', sub: '25+ flavors, tossed till they drip.', img: 'assets/food/wings-basket-cutout.png', accent: 'orange' },
  { word: 'Sweet.', sub: 'Shakes, waffles, fried Oreos. No apologies.', img: 'assets/food/shakes-lineup.png', accent: 'cyan' },
]

export function FoodInterlude() {
  const [ref, progress] = useScrollProgress()
  const reduced = useReducedMotion()
  const active = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2

  // Reduced motion / fallback: a calm stacked layout, no pinning.
  if (reduced) {
    return (
      <section className="interlude interlude--static">
        {PANELS.map((p) => (
          <div className={`interlude__static-row interlude__static-row--${p.accent}`} key={p.word}>
            <Reveal as="h2" className="interlude__word font-display">{p.word}</Reveal>
            <img src={asset(p.img)} alt="" loading="lazy" />
            <p className="interlude__sub">{p.sub}</p>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="interlude" ref={ref} aria-label="Crispy, saucy, sweet">
      <div className="interlude__sticky">
        <div className="interlude__progress" aria-hidden="true">
          <span className="interlude__progress-fill" style={{ transform: `scaleY(${progress})` }} />
          {PANELS.map((p, i) => (
            <span key={p.word} className={`interlude__tick ${i <= active ? 'is-on' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
          ))}
        </div>

        {PANELS.map((p, i) => (
          <div key={p.word} className={`interlude__panel interlude__panel--${p.accent} ${i === active ? 'is-active' : ''}`} aria-hidden={i !== active}>
            <h2 className="interlude__word font-display">{p.word}</h2>
            <img className="interlude__img" src={asset(p.img)} alt="" loading="lazy" decoding="async" />
            <p className="interlude__sub">{p.sub}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
