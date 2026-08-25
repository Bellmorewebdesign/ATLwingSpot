import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ORDER_URL } from '../data/site'
import { asset } from '../lib/asset'
import { ArrowRight, ArrowLeft } from './Icons'
import './CraveTrack.css'

/**
 * Official ATL product photography. Every shot is lit on white, so each panel
 * is a WHITE card: the studio background matches the card exactly and leaves no
 * visible rectangle against the dark section. Captions sit under the image so no
 * scrim ever greys out the food.
 *
 * `official-quesadilla-stack` has no confirmed product identity, so it is used
 * at category level only.
 */
const PANELS = [
  { cat: 'wings',      name: 'Bone-In\nWings',      line: "Never frozen. They don't hit the fryer until you order them.",          img: 'assets/food/official/official-bone-in-wings.webp' },
  { cat: 'boneless',   name: 'Boneless',            line: 'All white meat, breaded by hand, and every sauce on the board works on these too.', img: 'assets/food/official/official-boneless-20pc.webp' },
  { cat: 'tenders',    name: 'Saucy\nTenders',      line: 'Jumbo. Ask for them tossed, or with the sauce on the side.',            img: 'assets/food/official/official-saucy-chicken-drip.webp' },
  { cat: 'waffles',    name: "Chicken\nN' Waffles", line: 'Fruity Pebbles, Oreo or Cinnamon Toast Crunch on the waffle. Yes, really.', img: 'assets/food/official/official-fruity-pebbles-chicken-waffles.webp' },
  { cat: 'sandwiches', name: 'Sandwiches',          line: 'Crispy chicken on a toasted bun, chipotle or classic.',                 img: 'assets/food/official/official-buffalo-ranch-sandwich.webp' },
  { cat: 'quesadillas', name: 'Quesadillas',        line: 'Four on the menu, from plain cheddar to loaded chicken.',               img: 'assets/food/official/official-quesadilla-stack.webp' },
]

export function CraveTrack() {
  const railRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setAtStart(el.scrollLeft < 12)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 12)
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => { el.removeEventListener('scroll', sync); window.removeEventListener('resize', sync) }
  }, [sync])

  const nudge = (dir) => {
    const el = railRef.current
    if (!el) return
    const panel = el.querySelector('.crave__panel')
    const step = panel ? panel.getBoundingClientRect().width + 16 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section className="crave ch-dark" id="crave">
      <div className="crave__head wrap">
        <h2 className="dsp dsp-sm crave__title">What are we eating?</h2>
        <div className="crave__nav">
          <button className="crave__arrow" onClick={() => nudge(-1)} disabled={atStart} aria-label="Previous">
            <ArrowLeft />
          </button>
          <button className="crave__arrow" onClick={() => nudge(1)} disabled={atEnd} aria-label="Next">
            <ArrowRight />
          </button>
        </div>
      </div>

      <ul className="crave__rail" ref={railRef} tabIndex={0} aria-label="Menu categories, scroll horizontally">
        {PANELS.map((p) => (
          <li className="crave__panel" key={p.cat}>
            <div className="crave__media">
              <img src={asset(p.img)} alt={p.name.replace('\n', ' ')} loading="lazy" decoding="async" />
            </div>
            <div className="crave__body">
              <h3 className="dsp crave__name">{p.name.split('\n').map((l, i) => <span key={i}>{l}</span>)}</h3>
              <p className="crave__line">{p.line}</p>
              <div className="crave__links">
                <Link className="btn btn-ink btn-sm" to={`/menu?cat=${p.cat}`}>See it</Link>
                <a className="btn btn-line btn-sm" href={ORDER_URL} target="_blank" rel="noopener noreferrer">Order</a>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="crave__hint wrap">Swipe or drag to see everything →</p>
    </section>
  )
}
