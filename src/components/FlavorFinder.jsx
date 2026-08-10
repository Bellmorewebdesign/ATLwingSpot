import { useMemo, useState } from 'react'
import { HEAT_LEVELS, STYLES, FLAVORS } from '../data/flavors'
import { asset } from '../lib/asset'
import { OrderButton } from './OrderButton'
import { Reveal } from './Reveal'
import { Flame } from './Icons'
import './FlavorFinder.css'

const HEAT_COLORS = {
  1: 'var(--atl-cyan)',
  2: 'var(--atl-orange)',
  3: 'var(--atl-orange-bright)',
  4: 'var(--atl-red)',
}

function HeatPips({ level, active }) {
  return (
    <span className="pips" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={`pips__dot ${n <= level ? 'is-on' : ''}`}
          style={n <= level ? { background: active } : undefined} />
      ))}
    </span>
  )
}

export function FlavorFinder({ withHeader = true, index = '03' }) {
  const [heat, setHeat] = useState(2)
  const [style, setStyle] = useState('wet')

  const results = useMemo(() => {
    return [...FLAVORS]
      .filter((f) => f.style === style)
      .sort((a, b) => Math.abs(a.heat - heat) - Math.abs(b.heat - heat) || a.heat - b.heat)
      .slice(0, 3)
  }, [heat, style])

  const best = results[0]
  const accent = HEAT_COLORS[heat]

  return (
    <section className="section finder" id="flavors" style={{ '--heat': accent }}>
      <div className="finder__glow" aria-hidden="true" />
      <div className="container-wide">
        {withHeader && (
          <div className="finder__head">
            <Reveal><p className="eyebrow"><span className="dot" /> {index} — Flavor Finder</p></Reveal>
            <Reveal delay={80}>
              <h2 className="section-title">Find your <span className="accent-o">flavor.</span></h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead finder__lead">Two questions. We narrow 25+ flavors down to your move.</p>
            </Reveal>
          </div>
        )}

        <div className="finder__stage">
          {/* CONTROLS */}
          <div className="finder__controls">
            <fieldset className="finder__step">
              <legend className="finder__q"><span className="finder__q-n">1</span> How much heat?</legend>
              <div className="heatbar" role="radiogroup" aria-label="Heat level">
                <span className="heatbar__fill" style={{ width: `${(heat / 4) * 100}%`, background: accent }} />
                {HEAT_LEVELS.map((h) => (
                  <button
                    key={h.id}
                    role="radio"
                    aria-checked={heat === h.id}
                    className={`heatbar__seg ${heat === h.id ? 'is-active' : ''}`}
                    onClick={() => setHeat(h.id)}
                  >
                    <Flame size={15} className="heatbar__flame" />
                    <span>{h.label}</span>
                  </button>
                ))}
              </div>
              <p className="finder__hint">{HEAT_LEVELS[heat - 1].tag}</p>
            </fieldset>

            <fieldset className="finder__step">
              <legend className="finder__q"><span className="finder__q-n">2</span> How do you like it?</legend>
              <div className="styletoggle" role="radiogroup" aria-label="Sauce style">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={style === s.id}
                    className={`styletoggle__btn ${style === s.id ? 'is-active' : ''}`}
                    onClick={() => setStyle(s.id)}
                  >
                    <strong>{s.label}</strong>
                    <span>{s.tag}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <OrderButton size="lg" className="finder__cta btn--block">
              Found your flavor. Order it
            </OrderButton>
            <p className="finder__note">Featured flavors — a taste of the 25+ waiting in store.</p>
          </div>

          {/* RESULT */}
          <div className="finder__result">
            <div className="finder__ring" aria-hidden="true" style={{ borderColor: accent }}>
              <img
                className="finder__product"
                src={asset('assets/food/wings-basket-cutout.png')}
                alt=""
                style={{ transform: `rotate(${(heat - 2) * 6}deg)` }}
                loading="lazy"
              />
            </div>

            <div className="finder__cards" key={`${heat}-${style}`}>
              {best && (
                <article className="flavor-card flavor-card--hero" style={{ '--fc': accent }}>
                  <div className="flavor-card__top">
                    <span className="flavor-card__style">{style === 'wet' ? 'Wet' : 'Dry Rub'}</span>
                    <HeatPips level={best.heat} active={accent} />
                  </div>
                  <h3 className="flavor-card__name font-display">{best.name}</h3>
                  <p className="flavor-card__desc">“{best.descriptor}”</p>
                </article>
              )}
              <div className="finder__alts">
                {results.slice(1).map((f) => (
                  <article className="flavor-card flavor-card--alt" key={f.id}>
                    <div className="flavor-card__row">
                      <h4 className="flavor-card__name-sm">{f.name}</h4>
                      <HeatPips level={f.heat} active={HEAT_COLORS[f.heat]} />
                    </div>
                    <p className="flavor-card__desc-sm">{f.descriptor}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
