import { useMemo, useState } from 'react'
import { asset } from '../lib/asset'
import { OrderButton } from './OrderButton'
import { Reveal } from './Reveal'
import './WingCalculator.css'

const HUNGER = [
  { id: 'snacky', label: 'Snacky', per: 4, tag: 'Grazing' },
  { id: 'hungry', label: 'Hungry', per: 7, tag: 'Down to eat' },
  { id: 'starving', label: 'Starving', per: 10, tag: 'Skipped lunch' },
]

// Snap a raw estimate to the nearest quantity ATL actually sells, so the
// suggestion tracks the crew size instead of overshooting to the next pack.
const ATL_QTYS = [6, 10, 20, 50, 100]
function roundToWings(raw) {
  if (raw > 100) return Math.round(raw / 50) * 50 // above 100, step in 50s
  return ATL_QTYS.reduce((best, q) => (Math.abs(q - raw) < Math.abs(best - raw) ? q : best), ATL_QTYS[0])
}

export function WingCalculator({ index = '05' }) {
  const [people, setPeople] = useState(8)
  const [hunger, setHunger] = useState('hungry')

  const { wings, flavors } = useMemo(() => {
    const per = HUNGER.find((h) => h.id === hunger).per
    return {
      wings: roundToWings(people * per),
      flavors: Math.min(Math.max(2, Math.round(people / 2)), 6),
    }
  }, [people, hunger])

  const clamp = (n) => Math.min(40, Math.max(1, n))

  return (
    <section className="section calc" id="calculator">
      <div className="container-wide calc__inner">
        <div className="calc__controls">
          <Reveal><p className="eyebrow"><span className="dot" /> {index} — Wing Calculator</p></Reveal>
          <Reveal delay={80}>
            <h2 className="section-title calc__title">Feed<br />the <span className="accent-c">crew.</span></h2>
          </Reveal>

          <Reveal delay={140} className="calc__field">
            <label className="calc__q" id="calc-people">How many people?</label>
            <div className="counter" role="group" aria-labelledby="calc-people">
              <button className="counter__btn" onClick={() => setPeople((p) => clamp(p - 1))} aria-label="One fewer person">–</button>
              <span className="counter__num font-display" key={people}>{people}</span>
              <button className="counter__btn" onClick={() => setPeople((p) => clamp(p + 1))} aria-label="One more person">+</button>
            </div>
          </Reveal>

          <Reveal delay={200} className="calc__field">
            <span className="calc__q" id="calc-hunger">How hungry are we?</span>
            <div className="hunger" role="radiogroup" aria-labelledby="calc-hunger">
              {HUNGER.map((h) => (
                <button
                  key={h.id}
                  role="radio"
                  aria-checked={hunger === h.id}
                  className={`hunger__btn ${hunger === h.id ? 'is-active' : ''}`}
                  onClick={() => setHunger(h.id)}
                >
                  <strong>{h.label}</strong>
                  <span>{h.tag}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={120} className="calc__result">
          <img className="calc__food" src={asset('assets/food/wings-basket-cutout.png')} alt="" loading="lazy" decoding="async" />
          <p className="calc__result-lead">We’d start with</p>
          <p className="calc__big font-display" key={wings}>
            {wings}<span className="calc__big-unit"> wings</span>
          </p>
          <p className="calc__spread">Spread it across <strong>{flavors} flavors</strong> so nobody fights over the basket.</p>
          <OrderButton size="lg" className="calc__cta btn--block">Order for the crew</OrderButton>
          <p className="calc__disclaimer">Just a suggestion. We won’t judge if you add more.</p>
        </Reveal>
      </div>
    </section>
  )
}
