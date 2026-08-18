import { useMemo, useState } from 'react'
import { HEAT_LEVELS, STYLES, FLAVORS, FLAVOR_COUNT } from '../data/flavors'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight } from './Icons'
import './FlavorStage.css'

// Heat 4 is dark enough to need light type; the rest read on ink.
const FG = { 1: '#121012', 2: '#121012', 3: '#121012', 4: '#f6efe1' }

export function FlavorStage({ heading = 'Pick your flavor.' }) {
  const [heat, setHeat] = useState(1)
  const [style, setStyle] = useState('wet')

  const matches = useMemo(
    () =>
      FLAVORS.filter((f) => f.style === style)
        .sort((a, b) => Math.abs(a.heat - heat) - Math.abs(b.heat - heat) || a.heat - b.heat),
    [heat, style]
  )

  const hero = matches[0]
  const others = matches.slice(1, 5)
  const level = HEAT_LEVELS[heat - 1]

  return (
    <section
      className="stage"
      id="flavors"
      style={{ '--tone': level.color, '--tone-fg': FG[heat] }}
    >
      {/* Abstract sauce field — colour, not fake product photography */}
      <div className="stage__disc" aria-hidden="true" />
      <img className="stage__food" src={asset('assets/food/wings-basket-cutout.png')} alt="" loading="lazy" aria-hidden="true" />

      <div className="stage__in wrap">
        <header className="stage__head">
          <h2 className="dsp dsp-md stage__title">{heading}</h2>
          <p className="stage__sub">{FLAVOR_COUNT} sauces and rubs. Good luck choosing one.</p>
        </header>

        <div className="stage__controls">
          <fieldset className="stage__set">
            <legend className="stage__legend">How much heat?</legend>
            <div className="heat" role="radiogroup" aria-label="Heat level">
              {HEAT_LEVELS.map((h) => (
                <button
                  key={h.id}
                  role="radio"
                  aria-checked={heat === h.id}
                  className={`heat__b ${heat === h.id ? 'on' : ''}`}
                  onClick={() => setHeat(h.id)}
                  style={{ '--lvl': h.color }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="stage__set stage__set--style">
            <legend className="stage__legend">Wet or dry?</legend>
            <div className="wetdry" role="radiogroup" aria-label="Sauce style">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={style === s.id}
                  className={`wetdry__b ${style === s.id ? 'on' : ''}`}
                  onClick={() => setStyle(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="stage__result" key={`${heat}-${style}`} aria-live="polite">
          <p className="stage__pick">{level.label} · {style === 'wet' ? 'Wet' : 'Dry rub'} · start here</p>
          <p className="dsp stage__name">{hero.name}</p>
          <p className="stage__blurb">“{hero.blurb}”</p>
        </div>

        <div className="stage__foot">
          <a className="btn btn-ink btn-lg" href={ORDER_URL} target="_blank" rel="noopener noreferrer">
            Order this <ArrowRight />
          </a>
          <ul className="stage__also">
            {others.map((f) => (
              <li key={f.id}><button className="chip" onClick={() => setHeat(f.heat)}>{f.name}</button></li>
            ))}
          </ul>
        </div>

        <p className="stage__note">A few of the {FLAVOR_COUNT}. The full list is on the board in store.</p>
      </div>
    </section>
  )
}
