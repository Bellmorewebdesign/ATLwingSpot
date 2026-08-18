import { HEAT_LEVELS, STYLES, FLAVORS, FLAVOR_COUNT } from '../data/flavors'
import { Seo } from '../components/Seo'
import { FlavorStage } from '../components/FlavorStage'
import { Reveal } from '../components/Reveal'
import './Flavors.css'

export default function Flavors() {
  return (
    <div className="page flav">
      <Seo
        title="Flavors"
        description="25+ sauces and rubs at ATL Wing Spot — from Buttery Garlic Parmesan and Lemon Pepper to Mango Habanero and 911 Sauce. Pick your heat, wet or dry."
      />

      <FlavorStage heading="Pick your flavor." />

      <section className="sec ch-cream flav__list">
        <div className="wrap">
          <h2 className="dsp dsp-sm flav__h">The board</h2>
          <p className="flav__note">
            {FLAVOR_COUNT} sauces and rubs in store. Here are the regulars, grouped by how hot they run.
          </p>

          {HEAT_LEVELS.map((lvl) => {
            const set = FLAVORS.filter((f) => f.heat === lvl.id)
            if (!set.length) return null
            return (
              <div className="tier" key={lvl.id} style={{ '--tone': lvl.color }}>
                <div className="tier__head">
                  <h3 className="dsp tier__name">{lvl.label}</h3>
                  <span className="tier__blurb">{lvl.blurb}</span>
                </div>
                <ul className="tier__items">
                  {set.map((f, i) => (
                    <Reveal as="li" className="fl" key={f.id} delay={i * 40}>
                      <span className="fl__name">{f.name}</span>
                      <span className="fl__blurb">{f.blurb}</span>
                      <span className="fl__style">
                        {STYLES.find((s) => s.id === f.style).label}
                      </span>
                    </Reveal>
                  ))}
                </ul>
              </div>
            )
          })}

          <p className="fineprint flav__fine">
            Sauces rotate and vary by shop. Ask what&rsquo;s on the board today.
          </p>
        </div>
      </section>
    </div>
  )
}
