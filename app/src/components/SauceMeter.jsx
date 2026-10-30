import { SAUCE_METER, SAUCE_HEAT_GROUPS } from '../data/flavors'
import './SauceMeter.css'

/**
 * "SAUCE IT UP FLAVORS!" — the client's heat chart, rebuilt in HTML/CSS.
 *
 * One bar per sauce, hottest at the top. Colour comes from the sauce's heat
 * group and length from its `len`, both in SAUCE_METER (src/data/flavors.js),
 * so reordering, recolouring or adding a sauce is a data change only.
 */
export function SauceMeter() {
  return (
    <section className="smeter" aria-labelledby="smeter-title">
      <div className="wrap smeter__in">
        <h2 className="dsp smeter__title" id="smeter-title">
          Sauce it up <span className="smeter__title-2">flavors!</span>
        </h2>

        <div className="smeter__chart">
          <div className="smeter__scale" aria-hidden="true">
            <span className="smeter__end">Hot</span>
            <span className="smeter__rail" />
            <span className="smeter__end">Mild</span>
          </div>

          <ol className="smeter__list" aria-label="Sauces from hottest to mildest">
            {SAUCE_METER.map((s) => {
              const g = SAUCE_HEAT_GROUPS[s.group]
              return (
                <li key={s.name}>
                  <span
                    className="smeter__bar"
                    style={{ '--len': s.len, '--bar': g.color, '--bar-fg': g.text }}
                  >
                    <span className="smeter__name">{s.name}</span>
                    {s.isNew && <span className="smeter__new">New</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
