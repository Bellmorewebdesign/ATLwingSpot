import { useMemo, useState } from 'react'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight } from './Icons'
import './CrewCalc.css'

const HUNGER = [
  { id: 'snacky', label: 'Snacky', per: 4 },
  { id: 'hungry', label: 'Hungry', per: 7 },
  { id: 'starving', label: 'Starving', per: 10 },
]

// Snap to a count ATL actually sells so the number is orderable as-is.
const SIZES = [6, 10, 20, 50, 100]
const snap = (raw) =>
  raw > 100
    ? Math.round(raw / 50) * 50
    : SIZES.reduce((best, q) => (Math.abs(q - raw) < Math.abs(best - raw) ? q : best), SIZES[0])

export function CrewCalc() {
  const [people, setPeople] = useState(8)
  const [hunger, setHunger] = useState('hungry')

  const wings = useMemo(
    () => snap(people * HUNGER.find((h) => h.id === hunger).per),
    [people, hunger]
  )
  const clamp = (n) => Math.min(60, Math.max(1, n))

  return (
    <section className="crew ch-orange" id="crew">
      <img className="crew__food" src={asset('assets/food/crispy-tenders-cutout.webp')} alt="" loading="lazy" aria-hidden="true" />

      <div className="crew__in wrap-tight">
        <h2 className="dsp dsp-sm crew__title">Feeding a crew?</h2>

        <div className="crew__row">
          <span className="crew__q">How many people</span>
          <div className="counter">
            <button className="counter__b" onClick={() => setPeople((p) => clamp(p - 1))} aria-label="One fewer person">–</button>
            <span className="dsp counter__n" key={people}>{String(people).padStart(2, '0')}</span>
            <button className="counter__b" onClick={() => setPeople((p) => clamp(p + 1))} aria-label="One more person">+</button>
          </div>
        </div>

        <div className="crew__row crew__row--hunger" role="radiogroup" aria-label="How hungry">
          <span className="crew__q">and how hungry</span>
          <div className="hunger">
            {HUNGER.map((h) => (
              <button
                key={h.id}
                role="radio"
                aria-checked={hunger === h.id}
                className={`hunger__b ${hunger === h.id ? 'on' : ''}`}
                onClick={() => setHunger(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div className="crew__out" aria-live="polite">
          <p className="crew__lead">Start with about</p>
          <p className="dsp crew__num" key={wings}>{wings}</p>
          <p className="crew__unit">wings</p>
        </div>

        <div className="crew__cta">
          <a className="btn btn-ink btn-lg" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
            Order for the crew <ArrowRight />
          </a>
          <p className="crew__note">It&rsquo;s a starting point, not a rule. You know your people better than we do.</p>
        </div>
      </div>
    </section>
  )
}
